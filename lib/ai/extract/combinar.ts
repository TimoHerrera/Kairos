import type { BuyerCriteria, Property } from "@/lib/data/types";
import { CARACTERISTICAS, FINANCIACION, TIPO_PROPIEDAD, etiquetaCaracteristica } from "@/lib/domain/labels";
import { formatMonto } from "@/lib/format";
import { antesDe } from "@/lib/format/tiempo";
import type { NotaExtraida } from "./schema";

type Ficha = Omit<BuyerCriteria, "buyer_id" | "agent_id" | "source_note_id" | "field_sources" | "updated_at">;
export type CambiosFicha = Partial<Ficha>;

const plano = (t: string) =>
  t
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

/** "Balcón" o "balcón" → "balcon" si es una característica conocida; si no, el texto tal cual. */
export function claveCaracteristica(texto: string): string {
  const t = plano(texto).replace(/\s+/g, "_");
  if (CARACTERISTICAS[t]) return t;
  const porEtiqueta = Object.entries(CARACTERISTICAS).find(([, etiqueta]) => plano(etiqueta) === plano(texto));
  return porEtiqueta?.[0] ?? texto.trim();
}

function lista(claves: string[]) {
  const nombres = claves.map((c) => etiquetaCaracteristica(c).toLowerCase());
  return nombres.length <= 1 ? nombres.join("") : `${nombres.slice(0, -1).join(", ")} y ${nombres.at(-1)}`;
}

/**
 * Combina lo que dijo una nota con la ficha actual. No pisa la ficha: solo cambia
 * lo que la nota dice, suma a las listas y devuelve en frases cortas qué cambió
 * ("Subió el tope a USD 185.000"). Una ficha nueva parte de la ficha vacía.
 */
export function combinarNota(ficha: Ficha, nota: NotaExtraida): { cambios: CambiosFicha; frases: string[] } {
  const cambios: CambiosFicha = {};
  const frases: string[] = [];

  if (nota.operacion && nota.operacion !== ficha.operation) {
    cambios.operation = nota.operacion;
    frases.push(nota.operacion === "rent" ? "Busca alquilar" : "Busca comprar");
  }

  const min = nota.ambientes_min ?? nota.ambientes_max;
  const max = nota.ambientes_max ?? nota.ambientes_min;

  if (nota.tipo && nota.tipo !== ficha.property_type) {
    cambios.property_type = nota.tipo;
    // "Busca 3 ambientes" ya dice que es un departamento: no lo repetimos.
    if (!(nota.tipo === "apartment" && min)) {
      frases.push(`${ficha.property_type ? "Ahora busca" : "Busca"} ${TIPO_PROPIEDAD[nota.tipo].toLowerCase()}`);
    }
  }

  if (min && (min !== ficha.rooms_min || max !== ficha.rooms_max)) {
    cambios.rooms_min = min;
    cambios.rooms_max = max;
    const texto = min === max ? `${min} ${min === 1 ? "ambiente" : "ambientes"}` : `de ${min} a ${max} ambientes`;
    frases.push(`${ficha.rooms_min ? "Ahora busca" : "Busca"} ${texto}`);
  }

  if (nota.dormitorios && nota.dormitorios !== ficha.bedrooms) {
    cambios.bedrooms = nota.dormitorios;
    frases.push(`Necesita ${nota.dormitorios} ${nota.dormitorios === 1 ? "dormitorio" : "dormitorios"}`);
  }

  if (nota.barrio && plano(nota.barrio) !== plano(ficha.neighborhood ?? "")) {
    cambios.neighborhood = nota.barrio;
    // Si cambia de barrio, las subzonas del anterior ya no aplican.
    if (ficha.neighborhood) cambios.subzones = [];
    frases.push(ficha.neighborhood ? `Ahora busca en ${nota.barrio} (antes ${ficha.neighborhood})` : `Zona: ${nota.barrio}`);
  }

  const subzonasBase = cambios.subzones ?? ficha.subzones;
  const nuevasSubzonas = nota.subzonas.filter((s) => !subzonasBase.some((x) => plano(x) === plano(s)));
  if (nuevasSubzonas.length) {
    cambios.subzones = [...subzonasBase, ...nuevasSubzonas];
    frases.push(`${nuevasSubzonas.length === 1 ? "Sumó la subzona" : "Sumó las subzonas"} ${nuevasSubzonas.join(", ")}`);
  }

  if (nota.presupuesto_max && nota.presupuesto_max !== ficha.budget_max) {
    const moneda = nota.moneda ?? ficha.currency;
    cambios.budget_max = nota.presupuesto_max;
    if (moneda !== ficha.currency) cambios.currency = moneda;
    const monto = formatMonto(nota.presupuesto_max, moneda);
    if (!ficha.budget_max || moneda !== ficha.currency) frases.push(`Tope: ${monto}`);
    else frases.push(nota.presupuesto_max > ficha.budget_max ? `Subió el tope a ${monto}` : `Bajó el tope a ${monto}`);
  } else if (nota.moneda && nota.moneda !== ficha.currency && ficha.budget_max === null) {
    cambios.currency = nota.moneda;
  }

  if (nota.financiacion && nota.financiacion !== "undefined" && nota.financiacion !== ficha.financing) {
    cambios.financing = nota.financiacion;
    frases.push(`Financiación: ${FINANCIACION[nota.financiacion].toLowerCase()}`);
  }

  if (nota.mudanza_antes_de && /^\d{4}-\d{2}$/.test(nota.mudanza_antes_de)) {
    const fecha = `${nota.mudanza_antes_de}-01`;
    if (fecha !== ficha.move_by) {
      cambios.move_by = fecha;
      frases.push(`Quiere mudarse ${antesDe(fecha).toLowerCase()}`);
    }
  }

  // Listas de características: se suman; lo que pasa a "no quiere" sale de las otras.
  const noQuiere = nota.no_quiere.map(claveCaracteristica);
  const importa = nota.le_importa.map(claveCaracteristica).filter((c) => !noQuiere.includes(c));
  const gustaria = nota.le_gustaria.map(claveCaracteristica).filter((c) => !noQuiere.includes(c) && !importa.includes(c));

  const nuevosNoQuiere = noQuiere.filter((c) => !ficha.deal_breakers.includes(c));
  const nuevosImporta = importa.filter((c) => !ficha.must_haves.includes(c));
  const nuevosGustaria = gustaria.filter((c) => !ficha.nice_to_haves.includes(c) && !ficha.must_haves.includes(c));

  if (nuevosImporta.length || noQuiere.some((c) => ficha.must_haves.includes(c))) {
    cambios.must_haves = [...ficha.must_haves.filter((c) => !noQuiere.includes(c)), ...nuevosImporta];
  }
  if (nuevosGustaria.length || importa.some((c) => ficha.nice_to_haves.includes(c)) || noQuiere.some((c) => ficha.nice_to_haves.includes(c))) {
    cambios.nice_to_haves = [
      ...ficha.nice_to_haves.filter((c) => !noQuiere.includes(c) && !importa.includes(c)),
      ...nuevosGustaria,
    ];
  }
  if (nuevosNoQuiere.length || importa.some((c) => ficha.deal_breakers.includes(c))) {
    cambios.deal_breakers = [...ficha.deal_breakers.filter((c) => !importa.includes(c)), ...nuevosNoQuiere];
  }
  if (nuevosImporta.length) frases.push(`Le importa: ${lista(nuevosImporta)}`);
  if (nuevosGustaria.length) frases.push(`Le gustaría: ${lista(nuevosGustaria)}`);
  if (nuevosNoQuiere.length) frases.push(`No quiere: ${lista(nuevosNoQuiere)}`);

  return { cambios, frases };
}

/** La calle de una dirección, para comparar: "Av. Santa Fe 3900" → "santa fe". */
function calle(direccion: string) {
  return plano(direccion)
    .replace(/^(av\.?|avenida)\s+/, "")
    .replace(/\s+\d+.*$/, "")
    .trim();
}

/**
 * Busca entre las propiedades cargadas la que el agente nombró en la nota.
 * "el de Thames" encuentra "Thames 1700"; si hay número, tiene que coincidir.
 */
export function buscarPropiedad(texto: string, propiedades: Property[]): Property | null {
  const t = plano(texto).replace(/^(el|la|lo)\s+(de\s+)?/, "");
  const numero = t.match(/\b(\d{2,5})\b/)?.[1];
  const candidatas = propiedades.filter((p) => {
    const c = calle(p.address);
    if (!c || !t.includes(c)) return false;
    return !numero || p.address.includes(numero);
  });
  return candidatas.length === 1 ? candidatas[0] : null;
}

/** La ficha vacía, para un cliente nuevo. */
export const FICHA_VACIA: Ficha = {
  operation: "buy",
  property_type: null,
  rooms_min: null,
  rooms_max: null,
  bedrooms: null,
  neighborhood: null,
  subzones: [],
  currency: "USD",
  budget_max: null,
  budget_tolerance_pct: 0,
  financing: "undefined",
  move_by: null,
  must_haves: [],
  nice_to_haves: [],
  deal_breakers: [],
};
