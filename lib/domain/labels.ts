import type { BuyerStatus, Financing, Operation, PropertyType, TriState } from "@/lib/data/types";

/**
 * Las palabras de la interfaz. En el código los valores están en inglés;
 * al agente siempre le hablamos con las palabras del rubro.
 */
export const ESTADO_CLIENTE: Record<BuyerStatus, string> = {
  active: "Activo",
  paused: "En pausa",
  closed: "Cerró",
  lost: "Perdido",
};

export const OPERACION: Record<Operation, string> = { buy: "Compra", rent: "Alquiler" };

export const TIPO_PROPIEDAD: Record<PropertyType, string> = {
  apartment: "Departamento",
  house: "Casa",
  ph: "PH",
  land: "Terreno",
  commercial: "Local",
  other: "Otro",
};

export const FINANCIACION: Record<Financing, string> = {
  cash: "Contado",
  preapproved_credit: "Crédito hipotecario preaprobado",
  undefined: "A definir",
};

export const APTO_CREDITO: Record<TriState, string> = {
  yes: "Apto crédito",
  no: "No es apto crédito",
  unconfirmed: "Apto crédito a confirmar",
};

/**
 * Características que entiende el motor de coincidencias (fase 5).
 * Lo que no esté acá se guarda como texto libre y se muestra tal cual.
 */
export const CARACTERISTICAS: Record<string, string> = {
  balcon: "Balcón",
  luminoso: "Luminoso",
  planta_baja: "Planta baja",
  sobre_avenida: "Sobre avenida",
  cochera: "Cochera",
  patio: "Patio",
  terraza: "Terraza",
  jardin: "Jardín",
  ascensor: "Ascensor",
  mascotas: "Acepta mascotas",
  pileta: "Pileta",
  silencioso: "Silencioso",
  a_refaccionar: "A refaccionar",
  contrafrente: "Contrafrente",
};

export function etiquetaCaracteristica(clave: string): string {
  return CARACTERISTICAS[clave] ?? clave;
}

/** "3 amb", "Casa", "PH 3 amb" */
export function ambientesCorto(tipo: PropertyType, ambientes: number | null): string {
  if (tipo === "house") return "Casa";
  if (tipo === "ph") return ambientes ? `PH ${ambientes} amb` : "PH";
  if (tipo === "apartment") return ambientes ? `${ambientes} amb` : "Departamento";
  return TIPO_PROPIEDAD[tipo];
}

/** "4º piso", "Planta baja" */
export function pisoTexto(piso: number | null): string | null {
  if (piso === null) return null;
  return piso === 0 ? "Planta baja" : `${piso}º piso`;
}
