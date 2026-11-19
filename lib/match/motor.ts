import type { BuyerCriteria, DiscardWithProperty, MatchReasons, Property } from "@/lib/data/types";
import { etiquetaCaracteristica, pisoTexto } from "@/lib/domain/labels";
import { formatMonto } from "@/lib/format";
import { mismoBarrio, sonLimitrofes } from "./limitrofes";

/**
 * Motor de coincidencias: funciones puras, sin datos ni red.
 * 1. Filtros duros que excluyen.
 * 2. Puntaje 0–100 ponderado.
 * 3. Explicación en texto natural y "Cumple X de las Y cosas que busca".
 * 4. Parecido con lo que el cliente ya descartó.
 */

export type Opciones = {
  /** Aceptar barrios limítrofes con penalización. Por defecto, sí. */
  limitrofes?: boolean;
};

export type Exclusion = { encaja: false; motivo: string };

export type Coincidencia = {
  encaja: true;
  /** 0 a 100 */
  score: number;
  /** Cuántas de las cosas que busca cumple (las "a confirmar" no cuentan). */
  cumple: number;
  /** Cuántas cosas busca en total. */
  total: number;
  reasons: MatchReasons;
  similar_to_discard: boolean;
};

export type Resultado = Exclusion | Coincidencia;

/** Pesos del puntaje. Se normaliza sobre los que aplican: lo que el cliente no pidió no resta. */
export const PESOS = {
  zona: 25,
  precio: 20,
  ambientes: 15,
  le_importa: 20,
  financiacion: 10,
  le_gustaria: 5,
} as const;

/** Lo que falta confirmar vale un poco más de la mitad: no suma como un sí, pero no es un no. */
const A_CONFIRMAR = 0.6;
const PENALIZACION_DESCARTE = 15;

const plano = (t: string) =>
  t
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

/** La calle sin altura ni "Av.": para comparar con lo que descartó. */
function calle(direccion: string) {
  return plano(direccion)
    .replace(/^(av\.?|avda\.?|avenida)\s+/, "")
    .replace(/\s+(al\s+)?\d+.*$/, "")
    .trim();
}

type Estado = "si" | "no" | "duda";

/** ¿La propiedad tiene esta característica? "duda" cuando el dato no está o no se puede saber. */
export function tieneCaracteristica(p: Property, clave: string): Estado {
  switch (clave) {
    case "balcon":
      return p.balcony ? "si" : "no";
    case "planta_baja":
      return p.floor === null ? "duda" : p.floor === 0 ? "si" : "no";
    case "sobre_avenida":
      return p.on_avenue ? "si" : "no";
    case "luminoso":
      if (p.amenities.includes("luminoso")) return "si";
      return p.orientation && /^(norte|noreste|noroeste)$/i.test(p.orientation) ? "si" : "duda";
    case "silencioso":
      if (p.amenities.includes("silencioso")) return "si";
      return p.on_avenue ? "no" : "duda";
    case "contrafrente":
    case "a_refaccionar":
    case "cochera":
    case "patio":
    case "terraza":
    case "jardin":
    case "ascensor":
    case "pileta":
    case "mascotas":
      return p.amenities.includes(clave) ? "si" : "no";
    default:
      // Algo que el agente escribió con sus palabras ("cerca del subte"): no lo podemos saber.
      return p.amenities.some((a) => plano(a) === plano(clave)) ? "si" : "duda";
  }
}

function textoAmbientes(p: Property): string {
  if (p.property_type === "house") return "Casa";
  if (p.property_type === "ph") return `PH de ${p.rooms} ambientes`;
  if (p.property_type === "apartment") return `${p.rooms} ${p.rooms === 1 ? "ambiente" : "ambientes"}`;
  return `${p.rooms} ambientes`;
}

function zonaDe(p: Property): string {
  if (!p.subzone) return p.neighborhood;
  return p.subzone.startsWith(p.neighborhood) ? p.subzone : `${p.neighborhood} ${p.subzone}`;
}

function frasePositiva(p: Property, clave: string): string {
  switch (clave) {
    case "balcon":
      return "Tiene balcón";
    case "luminoso":
      return p.orientation ? `Orientación ${p.orientation.toLowerCase()}, muy luminoso` : "Muy luminoso";
    case "silencioso":
      return "Calle tranquila";
    default:
      return `Tiene ${etiquetaCaracteristica(clave).toLowerCase()}`;
  }
}

function fraseNoQuiere(p: Property, clave: string): string {
  switch (clave) {
    case "planta_baja":
      return `${pisoTexto(p.floor) ?? "Piso alto"}, no es planta baja`;
    case "sobre_avenida":
      return p.amenities.includes("silencioso") ? "Calle tranquila, no es avenida" : "No es avenida";
    default:
      return `No tiene ${etiquetaCaracteristica(clave).toLowerCase()}`;
  }
}

/** Por qué una propiedad no le sirve a un cliente (filtros duros). null si pasa. */
export function filtrar(
  ficha: BuyerCriteria,
  p: Property,
  descartes: DiscardWithProperty[],
  opciones: Opciones = {},
): string | null {
  if (descartes.some((d) => d.property_id === p.id)) return "Ya la descartó";
  if (p.operation !== ficha.operation) return ficha.operation === "rent" ? "Busca alquilar" : "Busca comprar";
  if (ficha.property_type && p.property_type !== ficha.property_type) return "Busca otro tipo de propiedad";

  if (ficha.budget_max) {
    if (p.currency !== ficha.currency) return "Está en otra moneda";
    const techo = ficha.budget_max * (1 + ficha.budget_tolerance_pct / 100);
    if (p.price > techo) return `Se pasa de su tope (${formatMonto(ficha.budget_max, ficha.currency)})`;
  }

  if (ficha.neighborhood && !mismoBarrio(ficha.neighborhood, p.neighborhood)) {
    const limitrofe = (opciones.limitrofes ?? true) && sonLimitrofes(ficha.neighborhood, p.neighborhood);
    if (!limitrofe) return `Está en ${p.neighborhood} y busca en ${ficha.neighborhood}`;
  }

  if (ficha.rooms_min && p.rooms < ficha.rooms_min) return `Tiene ${p.rooms} ambientes y busca ${ficha.rooms_min} o más`;
  if (ficha.rooms_max && p.rooms > ficha.rooms_max) return `Tiene ${p.rooms} ambientes y busca hasta ${ficha.rooms_max}`;

  for (const clave of ficha.deal_breakers) {
    if (tieneCaracteristica(p, clave) === "si") return `${etiquetaCaracteristica(clave)}: no quiere`;
  }
  return null;
}

const EVITAMOS: Record<string, string> = {
  planta_baja: "plantas bajas",
  sobre_avenida: "avenidas",
  contrafrente: "contrafrentes",
  a_refaccionar: "propiedades a refaccionar",
};

/** ¿Se parece a algo que ya descartó? Misma calle, o el mismo problema que dio como motivo. */
function parecidoADescarte(p: Property, descartes: DiscardWithProperty[]): DiscardWithProperty | null {
  for (const d of descartes) {
    const otra = d.property;
    if (otra && calle(otra.address) === calle(p.address)) return d;
    const motivo = plano(d.reason);
    if (/oscur/.test(motivo) && tieneCaracteristica(p, "luminoso") !== "si") return d;
    if (/chic|pequen|chiquit/.test(motivo) && otra?.covered_m2 && p.covered_m2 && p.covered_m2 <= otra.covered_m2) return d;
    if (/expensas/.test(motivo) && otra?.expenses && p.expenses && p.expenses >= otra.expenses) return d;
    if (/ruid/.test(motivo) && p.on_avenue) return d;
  }
  return null;
}

/** Evalúa una propiedad para un cliente. */
export function evaluar(
  ficha: BuyerCriteria,
  p: Property,
  descartes: DiscardWithProperty[] = [],
  opciones: Opciones = {},
): Resultado {
  const motivo = filtrar(ficha, p, descartes, opciones);
  if (motivo) return { encaja: false, motivo };

  const met: string[] = [];
  const unmet: string[] = [];
  const unconfirmed: string[] = [];
  let ganado = 0;
  let posible = 0;
  let cumple = 0;
  let total = 0;

  // Zona y ambientes: una sola cosa para el agente ("3 ambientes en Palermo Soho").
  const hayZona = Boolean(ficha.neighborhood);
  const hayAmbientes = Boolean(ficha.rooms_min || ficha.rooms_max || ficha.property_type);
  if (hayZona || hayAmbientes) {
    total += 1;
    let zonaTexto = zonaDe(p);
    if (hayZona) {
      posible += PESOS.zona;
      if (!mismoBarrio(ficha.neighborhood, p.neighborhood)) {
        // Limítrofe: suma poco, y nada si eligió subzonas puntuales.
        ganado += ficha.subzones.length ? 0 : PESOS.zona * 0.3;
        zonaTexto = `${zonaDe(p)}, limítrofe con ${ficha.neighborhood}`;
      } else if (ficha.subzones.length && !ficha.subzones.some((s) => p.subzone && plano(s) === plano(p.subzone))) {
        ganado += PESOS.zona * 0.72;
        zonaTexto = `${zonaDe(p)} (busca ${ficha.subzones.join(", ")})`;
      } else {
        ganado += PESOS.zona;
      }
    }
    if (hayAmbientes) {
      posible += PESOS.ambientes;
      ganado += PESOS.ambientes;
    }
    const frase = `${textoAmbientes(p)} en ${zonaTexto}`;
    if (hayZona && !mismoBarrio(ficha.neighborhood, p.neighborhood)) unconfirmed.push(frase);
    else {
      met.push(frase);
      cumple += 1;
    }
  }

  // Precio: más puntaje cuanto más debajo del tope.
  if (ficha.budget_max) {
    total += 1;
    posible += PESOS.precio;
    const diferencia = ficha.budget_max - p.price;
    const precio = formatMonto(p.price, p.currency);
    if (diferencia >= 0) {
      const holgura = Math.min(1, diferencia / (ficha.budget_max * 0.1));
      ganado += PESOS.precio * (0.7 + 0.3 * holgura);
      met.push(
        diferencia === 0
          ? `${precio}, justo su tope`
          : `${precio} — ${formatMonto(diferencia, p.currency)} por debajo de su tope`,
      );
      cumple += 1;
    } else {
      ganado += PESOS.precio * 0.4;
      unconfirmed.push(`${precio} — ${formatMonto(-diferencia, p.currency)} arriba de su tope, dentro de lo que acepta`);
    }
  }

  // Lo que le importa.
  if (ficha.must_haves.length) {
    posible += PESOS.le_importa;
    let parcial = 0;
    for (const clave of ficha.must_haves) {
      total += 1;
      const estado = tieneCaracteristica(p, clave);
      if (estado === "si") {
        parcial += 1;
        cumple += 1;
        met.push(frasePositiva(p, clave));
      } else if (estado === "duda") {
        parcial += A_CONFIRMAR;
        unconfirmed.push(`${etiquetaCaracteristica(clave)}: a confirmar`);
      } else {
        unmet.push(`No tiene ${etiquetaCaracteristica(clave).toLowerCase()}`);
      }
    }
    ganado += PESOS.le_importa * (parcial / ficha.must_haves.length);
  }

  // Lo que no quiere: ya pasó el filtro, así que se cumple (o queda a confirmar si falta el dato).
  for (const clave of ficha.deal_breakers) {
    total += 1;
    const estado = tieneCaracteristica(p, clave);
    if (estado === "no") {
      cumple += 1;
      met.push(fraseNoQuiere(p, clave));
    } else {
      unconfirmed.push(`${etiquetaCaracteristica(clave)}: a confirmar`);
    }
  }

  // Financiación: si usa crédito, que sea apto crédito.
  if (ficha.financing === "preapproved_credit") {
    total += 1;
    posible += PESOS.financiacion;
    if (p.credit_eligible === "yes") {
      ganado += PESOS.financiacion;
      cumple += 1;
      met.push("Apto crédito");
    } else if (p.credit_eligible === "unconfirmed") {
      ganado += PESOS.financiacion * A_CONFIRMAR;
      unconfirmed.push("Apto crédito: a confirmar con el propietario");
    } else {
      unmet.push("No es apto crédito, y tiene crédito preaprobado");
    }
  }

  // Lo que le gustaría: suma, pero no cuenta en "X de las Y".
  if (ficha.nice_to_haves.length) {
    posible += PESOS.le_gustaria;
    let parcial = 0;
    for (const clave of ficha.nice_to_haves) {
      const estado = tieneCaracteristica(p, clave);
      if (estado === "si") {
        parcial += 1;
        met.push(`Además, ${frasePositiva(p, clave).toLowerCase()}`);
      } else if (estado === "no") {
        unmet.push(`No tiene ${etiquetaCaracteristica(clave).toLowerCase()}`);
      }
    }
    ganado += PESOS.le_gustaria * (parcial / ficha.nice_to_haves.length);
  }

  let score = posible ? (ganado / posible) * 100 : 50;

  // Parecido con lo que descartó: baja el puntaje y lo dice.
  const parecido = parecidoADescarte(p, descartes);
  let discard_note: string | null = null;
  if (parecido) {
    score -= PENALIZACION_DESCARTE;
    const nombre = parecido.property?.address ?? parecido.property_text ?? "una que descartó";
    discard_note = `Se parece a ${nombre}, que descartó: “${parecido.reason}”.`;
  } else if (descartes.length) {
    const evitamos = ficha.deal_breakers.map((c) => EVITAMOS[c]).filter(Boolean);
    discard_note = evitamos.length
      ? `No se parece a lo que descartó: evitamos ${evitamos.join(" y ")}.`
      : "No se parece a lo que descartó.";
  }

  return {
    encaja: true,
    score: Math.max(0, Math.min(100, Math.round(score))),
    cumple,
    total,
    reasons: { met, unmet, unconfirmed, discard_note, cumple, total },
    similar_to_discard: Boolean(parecido),
  };
}

/** "Encaja muy bien", "Encaja bien"… para el anillo. */
export function calificacion(score: number): string {
  if (score >= 90) return "Encaja muy bien";
  if (score >= 75) return "Encaja bien";
  if (score >= 60) return "Encaja en parte";
  return "Encaja poco";
}
