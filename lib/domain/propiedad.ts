import type { AvisoExtraido } from "@/lib/ai/listing/schema";
import type { NewProperty, Portal } from "@/lib/data";
import { formatNumero } from "@/lib/format";

/** zonaprop.com.ar → zonaprop. Sin link, null. */
export function portalDeUrl(url: string | null | undefined): Portal | null {
  if (!url) return null;
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (host.includes("zonaprop")) return "zonaprop";
    if (host.includes("argenprop")) return "argenprop";
    if (host.includes("mercadolibre") || host.includes("mercadoli")) return "mercadolibre";
    return "other";
  } catch {
    return null;
  }
}

export const NOMBRE_PORTAL: Record<Portal, string> = {
  zonaprop: "Zonaprop",
  argenprop: "Argenprop",
  mercadolibre: "MercadoLibre",
  other: "Otro portal",
};

/**
 * El borrador del formulario de alta: todo como texto, tal cual lo edita el agente.
 * Se convierte a NewProperty al guardar (borradorAPropiedad).
 */
export type Borrador = {
  address: string;
  neighborhood: string;
  subzone: string;
  operation: "buy" | "rent";
  property_type: NewProperty["property_type"];
  price: string;
  currency: "USD" | "ARS";
  expenses: string;
  rooms: string;
  bedrooms: string;
  covered_m2: string;
  total_m2: string;
  floor: string;
  orientation: string;
  balcony: boolean;
  on_avenue: boolean;
  credit_eligible: NewProperty["credit_eligible"];
  amenities: string[];
  url: string;
  description: string;
};

export const BORRADOR_VACIO: Borrador = {
  address: "",
  neighborhood: "",
  subzone: "",
  operation: "buy",
  property_type: "apartment",
  price: "",
  currency: "USD",
  expenses: "",
  rooms: "",
  bedrooms: "",
  covered_m2: "",
  total_m2: "",
  floor: "",
  orientation: "",
  balcony: false,
  on_avenue: false,
  credit_eligible: "unconfirmed",
  amenities: [],
  url: "",
  description: "",
};

const texto = (n: number | null) => (n === null || n === undefined ? "" : String(n).replace(".", ","));
/** Montos con punto de miles, como los escribe el agente: 179.000 */
const monto = (n: number | null) => (n === null || n === undefined ? "" : formatNumero(n));

/** Lo que leyó la IA (o las reglas) del aviso, como borrador para revisar. */
export function avisoABorrador(a: AvisoExtraido, original: { texto: string; url: string | null }): Borrador {
  return {
    ...BORRADOR_VACIO,
    address: a.direccion ?? "",
    neighborhood: a.barrio ?? "",
    subzone: a.subzona ?? "",
    operation: a.operacion ?? "buy",
    property_type: a.tipo ?? "apartment",
    price: a.precio ? monto(a.precio) : "",
    currency: a.moneda ?? "USD",
    expenses: monto(a.expensas),
    rooms: texto(a.ambientes),
    bedrooms: texto(a.dormitorios),
    covered_m2: texto(a.m2_cubiertos),
    total_m2: texto(a.m2_totales),
    floor: a.piso === 0 ? "PB" : texto(a.piso),
    orientation: a.orientacion ?? "",
    balcony: a.balcon ?? false,
    on_avenue: a.sobre_avenida ?? false,
    credit_eligible: a.apto_credito ?? "unconfirmed",
    amenities: a.amenities,
    url: original.url ?? "",
    description: original.texto.trim().slice(0, 2000),
  };
}

/** "180.000" o "180000" → 180000; "72,5" → 72.5; vacío → null; NaN si no es un número. */
export function leerNumero(t: string): number | null {
  const s = t.trim().replace(/\s/g, "");
  if (!s) return null;
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) return Number(s.replace(/\./g, "").replace(",", "."));
  return Number(s.replace(",", "."));
}

export type ErroresBorrador = Partial<Record<keyof Borrador, string>>;

/** Valida el borrador y lo convierte en una propiedad para guardar. */
export function borradorAPropiedad(
  b: Borrador,
  source: NewProperty["source"],
): { ok: true; propiedad: NewProperty } | { ok: false; errores: ErroresBorrador } {
  const errores: ErroresBorrador = {};
  const numeroValido = (campo: keyof Borrador, valor: number | null, opciones: { requerido?: boolean; entero?: boolean; min?: number; max?: number; mensaje: string }) => {
    if (valor === null) {
      if (opciones.requerido) errores[campo] = opciones.mensaje;
      return null;
    }
    if (!Number.isFinite(valor) || (opciones.entero && !Number.isInteger(valor)) || valor < (opciones.min ?? 0) || valor > (opciones.max ?? Infinity)) {
      errores[campo] = opciones.mensaje;
      return null;
    }
    return valor;
  };

  if (b.address.trim().length < 3) errores.address = "Escribí calle y altura, por ejemplo Gorriti 4800.";
  if (!b.neighborhood.trim()) errores.neighborhood = "Falta el barrio.";
  const price = numeroValido("price", leerNumero(b.price), { requerido: true, min: 1, mensaje: "El precio va en números, por ejemplo 172.000." });
  const rooms = numeroValido("rooms", leerNumero(b.rooms), { requerido: true, entero: true, min: 1, max: 20, mensaje: "Ambientes en número entero, por ejemplo 3." });
  const expenses = numeroValido("expenses", leerNumero(b.expenses), { mensaje: "Las expensas van en números." });
  const bedrooms = numeroValido("bedrooms", leerNumero(b.bedrooms), { entero: true, max: 20, mensaje: "Dormitorios en número entero." });
  const covered = numeroValido("covered_m2", leerNumero(b.covered_m2), { min: 1, max: 100000, mensaje: "Los m² van en números." });
  const total = numeroValido("total_m2", leerNumero(b.total_m2), { min: 1, max: 100000, mensaje: "Los m² van en números." });
  const pisoTexto = b.floor.trim().toLowerCase();
  const floor = ["pb", "planta baja", "0"].includes(pisoTexto)
    ? 0
    : numeroValido("floor", leerNumero(b.floor), { entero: true, max: 80, mensaje: "El piso va en número, o PB." });

  let url: string | null = null;
  if (b.url.trim()) {
    try {
      url = new URL(b.url.trim()).toString();
    } catch {
      errores.url = "Ese link no parece completo. Tiene que empezar con https://";
    }
  }

  if (Object.keys(errores).length) return { ok: false, errores };

  return {
    ok: true,
    propiedad: {
      source,
      url,
      portal: portalDeUrl(url),
      operation: b.operation,
      property_type: b.property_type,
      address: b.address.trim().replace(/^(av|avda|avenida)\.?\s+/i, "Av. "),
      neighborhood: b.neighborhood.trim(),
      subzone: b.subzone.trim() || null,
      price: price!,
      currency: b.currency,
      expenses,
      rooms: rooms!,
      bedrooms,
      covered_m2: covered,
      total_m2: total,
      floor,
      orientation: b.orientation.trim() || null,
      balcony: b.balcony,
      on_avenue: b.on_avenue || /^av\.\s/i.test(b.address.trim().replace(/^(av|avda|avenida)\.?\s+/i, "Av. ")),
      credit_eligible: b.credit_eligible,
      amenities: b.amenities,
      photos: [],
      description: b.description.trim() || null,
    },
  };
}
