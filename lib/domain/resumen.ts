import type { BuyerCriteria } from "@/lib/data/types";
import { formatMonto } from "@/lib/format";

type Criterios = Pick<
  BuyerCriteria,
  "operation" | "property_type" | "rooms_min" | "rooms_max" | "neighborhood" | "subzones" | "currency" | "budget_max"
>;

/** "Palermo", o "Belgrano R" cuando hay una sola subzona que ya nombra al barrio. */
export function zonaPrincipal(c: Pick<BuyerCriteria, "neighborhood" | "subzones">): string | null {
  if (!c.neighborhood) return c.subzones[0] ?? null;
  if (c.subzones.length === 1 && c.subzones[0].startsWith(c.neighborhood)) return c.subzones[0];
  return c.neighborhood;
}

function queBusca(c: Criterios): string | null {
  const { rooms_min: min, rooms_max: max } = c;
  const ambientes =
    min && max && min !== max
      ? `de ${min} a ${max} ambientes`
      : (min ?? max)
        ? `${min ?? max} ${(min ?? max) === 1 ? "ambiente" : "ambientes"}`
        : null;
  switch (c.property_type) {
    case "house":
      return "una casa";
    case "ph":
      return ambientes ? `un PH de ${ambientes.replace(/^de /, "")}` : "un PH";
    case "land":
      return "un terreno";
    case "commercial":
      return "un local";
    case "apartment":
      return ambientes ?? "un departamento";
    default:
      return ambientes;
  }
}

/**
 * La frase resumen de la ficha: "Busca 3 ambientes en Palermo, hasta USD 180.000".
 * Se rearma cada vez que la ficha cambia a mano. Devuelve null si todavía no se sabe nada.
 */
export function resumenDeFicha(c: Criterios, nombre: string): string | null {
  const que = queBusca(c);
  const zona = zonaPrincipal(c);
  const tope = c.budget_max ? formatMonto(c.budget_max, c.currency) : null;
  if (!que && !zona && !tope) return null;

  const plural = /\s(y|e)\s/i.test(nombre);
  const verbo = c.operation === "rent" ? (plural ? "Buscan alquilar" : "Busca alquilar") : plural ? "Buscan" : "Busca";

  let frase = `${verbo} ${que ?? "una propiedad"}`;
  if (zona) frase += ` en ${zona}`;
  if (tope) frase += `, hasta ${tope}`;
  return frase;
}
