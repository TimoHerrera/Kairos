import type { NewProperty } from "@/lib/data";
import { claveCaracteristica } from "@/lib/ai/extract/combinar";
import { BORRADOR_VACIO, borradorAPropiedad, type Borrador } from "./propiedad";

/**
 * Importar propiedades desde un CSV (Excel → "Guardar como CSV").
 * La plantilla está en /public/plantillas/propiedades.csv con estas columnas.
 */
export const COLUMNAS = [
  "direccion",
  "barrio",
  "subzona",
  "operacion",
  "tipo",
  "precio",
  "moneda",
  "expensas",
  "ambientes",
  "dormitorios",
  "m2_cubiertos",
  "m2_totales",
  "piso",
  "orientacion",
  "balcon",
  "sobre_avenida",
  "apto_credito",
  "amenities",
  "url",
  "descripcion",
] as const;

const plano = (t: string) =>
  t
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

/** Parte un CSV en filas y celdas. Detecta ; , o tabulación (Excel en castellano usa ;) y respeta comillas. */
export function parsearCsv(texto: string): string[][] {
  const limpio = texto.replace(/^﻿/, "").replace(/\r\n?/g, "\n");
  const primera = limpio.split("\n")[0] ?? "";
  const separador = ["\t", ";", ","]
    .map((s) => ({ s, n: primera.split(s).length }))
    .sort((a, b) => b.n - a.n)[0].s;

  const filas: string[][] = [];
  let fila: string[] = [];
  let celda = "";
  let entreComillas = false;
  for (let i = 0; i < limpio.length; i++) {
    const c = limpio[i];
    if (entreComillas) {
      if (c === '"' && limpio[i + 1] === '"') {
        celda += '"';
        i++;
      } else if (c === '"') entreComillas = false;
      else celda += c;
    } else if (c === '"' && celda === "") entreComillas = true;
    else if (c === separador) {
      fila.push(celda);
      celda = "";
    } else if (c === "\n") {
      fila.push(celda);
      filas.push(fila);
      fila = [];
      celda = "";
    } else celda += c;
  }
  if (celda !== "" || fila.length) {
    fila.push(celda);
    filas.push(fila);
  }
  return filas.filter((f) => f.some((c) => c.trim() !== ""));
}

export type FilaImportada = { numero: number; ok: true; propiedad: NewProperty } | { numero: number; ok: false; errores: string[] };

const OPERACION: Record<string, Borrador["operation"]> = { compra: "buy", venta: "buy", alquiler: "rent" };
const TIPO: Record<string, Borrador["property_type"]> = {
  departamento: "apartment",
  depto: "apartment",
  casa: "house",
  ph: "ph",
  terreno: "land",
  lote: "land",
  local: "commercial",
  oficina: "commercial",
  otro: "other",
};
const SI = new Set(["si", "sí", "s", "x", "1", "true", "yes"]);

/** Convierte las filas del CSV en propiedades válidas o en errores por fila (número de fila de la planilla). */
export function filasAPropiedades(filas: string[][]): { filas: FilaImportada[]; faltanColumnas: string[] } {
  if (!filas.length) return { filas: [], faltanColumnas: ["direccion", "barrio", "precio", "ambientes"] };
  const encabezado = filas[0].map((c) => plano(c).replace(/\s+/g, "_").replace("m²", "m2"));
  const indice = (col: string) => encabezado.indexOf(col);
  const faltanColumnas = ["direccion", "barrio", "precio", "ambientes"].filter((c) => indice(c) < 0);
  if (faltanColumnas.length) return { filas: [], faltanColumnas };

  const celda = (fila: string[], col: (typeof COLUMNAS)[number]) => {
    const i = indice(col);
    return i >= 0 ? (fila[i] ?? "").trim() : "";
  };

  const resultado = filas.slice(1).map((fila, i): FilaImportada => {
    const numero = i + 2;
    const errores: string[] = [];
    const op = plano(celda(fila, "operacion"));
    const tipo = plano(celda(fila, "tipo"));
    const moneda = plano(celda(fila, "moneda"));
    const credito = plano(celda(fila, "apto_credito"));
    if (op && !OPERACION[op]) errores.push(`Operación "${celda(fila, "operacion")}": usá compra o alquiler.`);
    if (tipo && !TIPO[tipo]) errores.push(`Tipo "${celda(fila, "tipo")}": usá departamento, casa, ph, terreno o local.`);
    if (moneda && !["usd", "ars", "u$s", "$", "pesos", "dolares"].includes(moneda)) errores.push(`Moneda "${celda(fila, "moneda")}": usá USD o ARS.`);

    const borrador: Borrador = {
      ...BORRADOR_VACIO,
      address: celda(fila, "direccion"),
      neighborhood: celda(fila, "barrio"),
      subzone: celda(fila, "subzona"),
      operation: OPERACION[op] ?? "buy",
      property_type: TIPO[tipo] ?? "apartment",
      price: celda(fila, "precio").replace(/^(usd|u\$s|\$)\s*/i, ""),
      currency: ["ars", "$", "pesos"].includes(moneda) ? "ARS" : "USD",
      expenses: celda(fila, "expensas").replace(/^\$\s*/, ""),
      rooms: celda(fila, "ambientes"),
      bedrooms: celda(fila, "dormitorios"),
      covered_m2: celda(fila, "m2_cubiertos"),
      total_m2: celda(fila, "m2_totales"),
      floor: celda(fila, "piso"),
      orientation: celda(fila, "orientacion"),
      balcony: SI.has(plano(celda(fila, "balcon"))),
      on_avenue: SI.has(plano(celda(fila, "sobre_avenida"))),
      credit_eligible: SI.has(credito) ? "yes" : credito === "no" ? "no" : "unconfirmed",
      amenities: celda(fila, "amenities")
        .split(/[|,]/)
        .map((a) => a.trim())
        .filter(Boolean)
        .map(claveCaracteristica),
      url: celda(fila, "url"),
      description: celda(fila, "descripcion"),
    };
    const r = borradorAPropiedad(borrador, "imported");
    if (!r.ok) errores.push(...Object.values(r.errores).filter((e): e is string => Boolean(e)));
    if (errores.length || !r.ok) return { numero, ok: false, errores };
    return { numero, ok: true, propiedad: r.propiedad };
  });
  return { filas: resultado, faltanColumnas: [] };
}
