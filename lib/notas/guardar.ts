import { buscarPropiedad, combinarNota } from "@/lib/ai/extract/combinar";
import type { NotaExtraida, PedidoExtraccion, RespuestaExtraccion } from "@/lib/ai/extract/schema";
import { getDataSource, type Buyer, type BuyerCriteria, type MatchWithRefs } from "@/lib/data";
import { FINANCIACION, OPERACION, TIPO_PROPIEDAD, etiquetaCaracteristica } from "@/lib/domain/labels";
import { resumenDeFicha, zonaPrincipal } from "@/lib/domain/resumen";
import { formatMonto } from "@/lib/format";
import { recalcularOportunidades } from "@/lib/match/recalcular";
import { normalizarTelefono } from "@/lib/format/telefono";

const plano = (t: string) =>
  t
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

/** Lo mínimo de la ficha que necesita la IA: sin nombre, teléfono ni email del cliente. */
export function fichaParaIA(f: BuyerCriteria | null): PedidoExtraccion["fichaActual"] {
  if (!f) return null;
  const ambientes =
    f.rooms_min && f.rooms_max && f.rooms_min !== f.rooms_max ? `${f.rooms_min} a ${f.rooms_max}` : (f.rooms_min ?? f.rooms_max)?.toString() ?? null;
  const zona = zonaPrincipal(f);
  return {
    operacion: OPERACION[f.operation],
    tipo: f.property_type ? TIPO_PROPIEDAD[f.property_type] : null,
    ambientes,
    zona: zona ? [zona, ...f.subzones.filter((s) => s !== zona)].join(", ") : null,
    presupuesto: f.budget_max ? formatMonto(f.budget_max, f.currency) : null,
    financiacion: f.financing === "undefined" ? null : FINANCIACION[f.financing],
    le_importa: f.must_haves.map(etiquetaCaracteristica),
    no_quiere: f.deal_breakers.map(etiquetaCaracteristica),
  };
}

/** Pide al servidor que ordene la nota. Nunca tira: un error vuelve como { ok: false }. */
export async function extraer(transcripcion: string, ficha: BuyerCriteria | null): Promise<RespuestaExtraccion> {
  try {
    const r = await fetch("/api/ai/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcripcion, fichaActual: fichaParaIA(ficha) } satisfies PedidoExtraccion),
    });
    return (await r.json()) as RespuestaExtraccion;
  } catch {
    return { ok: false, error: "No pudimos conectarnos para ordenar la nota." };
  }
}

/**
 * Clientes que podrían ser el que nombra la nota: mismo nombre completo,
 * o mismo nombre de pila cuando la nota dice solo el nombre ("Martina").
 */
export function clientesConEseNombre(nombre: string, clientes: Buyer[]): Buyer[] {
  const n = plano(nombre);
  const completo = clientes.filter((c) => plano(c.name) === n);
  if (completo.length) return completo;
  if (n.includes(" ")) return [];
  return clientes.filter((c) => plano(c.name).split(" ")[0] === n);
}

export type Destino = { tipo: "existente"; buyerId: string } | { tipo: "nuevo"; nombre: string; telefono: string | null };

export type NotaGuardada = { cliente: Buyer; nuevo: boolean; frases: string[]; oportunidades: MatchWithRefs[] };

/**
 * Guarda la nota y actualiza la ficha sin pisarla. Con `nota` en null (la IA no pudo),
 * guarda la transcripción tal cual en el historial para que el agente complete a mano.
 */
export async function guardarNota({
  destino,
  transcripcion,
  tipo,
  duracion,
  nota,
}: {
  destino: Destino;
  transcripcion: string;
  tipo: "audio" | "text";
  duracion: number | null;
  nota: NotaExtraida | null;
}): Promise<NotaGuardada> {
  const ds = getDataSource();
  const nuevo = destino.tipo === "nuevo";

  let cliente: Buyer | null =
    destino.tipo === "existente"
      ? await ds.buyers.get(destino.buyerId)
      : await ds.buyers.create({
          name: destino.nombre,
          phone: destino.telefono ? normalizarTelefono(destino.telefono) : null,
        });
  if (!cliente) throw new Error("No encontramos ese cliente.");

  const ficha = await ds.buyers.getCriteria(cliente.id);
  if (!ficha) throw new Error("No encontramos la ficha del cliente.");

  const { cambios, frases } = nota ? combinarNota(ficha, nota) : { cambios: {}, frases: [] as string[] };

  // Descartes que nombró la nota: si la propiedad está cargada, se enlaza; si ya estaba, no se repite.
  if (nota?.descartes.length) {
    const [propiedades, existentes] = await Promise.all([ds.properties.list(), ds.buyers.listDiscards(cliente.id)]);
    for (const d of nota.descartes) {
      const propiedad = buscarPropiedad(d.propiedad, propiedades);
      const repetido = existentes.some((e) =>
        propiedad ? e.property_id === propiedad.id : plano(e.property_text ?? "") === plano(d.propiedad),
      );
      if (repetido || !d.motivo.trim()) continue;
      await ds.buyers.addDiscard(cliente.id, {
        property_id: propiedad?.id ?? null,
        property_text: propiedad ? null : d.propiedad,
        reason: d.motivo,
      });
      frases.push(`Descartó ${propiedad?.address ?? d.propiedad}: “${d.motivo.trim()}”`);
    }
  }

  // Si dictó el teléfono y no lo teníamos, se guarda.
  const telefono = nota?.cliente.telefono ? normalizarTelefono(nota.cliente.telefono) : null;
  if (!nuevo && telefono && !cliente.phone) {
    cliente = await ds.buyers.update(cliente.id, { phone: telefono });
    frases.push("Guardé su WhatsApp");
  }

  const guardada = await ds.buyers.addNote(cliente.id, {
    kind: tipo,
    transcript: transcripcion,
    duration_seconds: duracion,
    extracted_json: nota,
    changes: frases,
  });

  let fichaFinal = ficha;
  if (Object.keys(cambios).length) {
    const fuentes = { ...ficha.field_sources };
    for (const campo of Object.keys(cambios)) fuentes[campo] = guardada.id;
    fichaFinal = await ds.buyers.updateCriteria(cliente.id, { ...cambios, source_note_id: guardada.id, field_sources: fuentes });
  }

  cliente = await ds.buyers.update(cliente.id, {
    summary: resumenDeFicha(fichaFinal, cliente.name) ?? cliente.summary,
    last_contact_at: new Date().toISOString(),
  });

  // Con la ficha al día, se cruza con las propiedades cargadas.
  const { nuevas } = await recalcularOportunidades(ds, { clienteIds: [cliente.id] });

  return { cliente, nuevo, frases, oportunidades: nuevas };
}
