import type { DataSource } from "@/lib/data/source";
import type { DiscardWithProperty, Id, MatchReasons, MatchWithRefs } from "@/lib/data/types";
import { evaluar, type Opciones } from "./motor";

/**
 * Cruza clientes con propiedades y deja las oportunidades al día:
 * - Encaja y supera el umbral: se crea en estado "nuevo", o se actualiza el puntaje si ya estaba.
 * - Ya no encaja: se borra si todavía no se mandó ni se descartó; si se mandó o se descartó, queda.
 *
 * Con `propiedadIds`, cruza esas propiedades con todos los clientes activos (al cargar una propiedad).
 * Con `clienteIds`, cruza esos clientes con todas las propiedades (al cambiar una ficha).
 */
export async function recalcularOportunidades(
  ds: DataSource,
  alcance: { propiedadIds?: Id[]; clienteIds?: Id[] },
  opciones: Opciones = {},
): Promise<{ nuevas: MatchWithRefs[]; actualizadas: number; borradas: number }> {
  const [agente, clientes, propiedades, existentes] = await Promise.all([
    ds.agent.get(),
    ds.buyers.list({ status: "active" }),
    ds.properties.list(),
    ds.matches.list(),
  ]);
  const umbral = agente.settings.alert_threshold;

  const clientesEnJuego = alcance.clienteIds ? clientes.filter((c) => alcance.clienteIds!.includes(c.id)) : clientes;
  const propiedadesEnJuego = alcance.propiedadIds
    ? propiedades.filter((p) => alcance.propiedadIds!.includes(p.id))
    : propiedades;

  const resultado = { nuevas: [] as MatchWithRefs[], actualizadas: 0, borradas: 0 };

  for (const cliente of clientesEnJuego) {
    const [ficha, descartes] = await Promise.all([ds.buyers.getCriteria(cliente.id), ds.buyers.listDiscards(cliente.id)]);
    if (!ficha) continue;
    // Sin nada de lo que busca no hay con qué comparar: no se inventan oportunidades.
    if (!ficha.neighborhood && !ficha.budget_max && !ficha.rooms_min && !ficha.property_type) continue;

    for (const propiedad of propiedadesEnJuego) {
      const r = evaluar(ficha, propiedad, descartes as DiscardWithProperty[], opciones);
      const existente = existentes.find((m) => m.buyer_id === cliente.id && m.property_id === propiedad.id);

      if (r.encaja && r.score >= umbral) {
        const { match, creada } = await ds.matches.upsert({
          buyer_id: cliente.id,
          property_id: propiedad.id,
          score: r.score,
          reasons: r.reasons,
          similar_to_discard: r.similar_to_discard,
        });
        if (creada) resultado.nuevas.push({ ...match, buyer: cliente, property: propiedad });
        else resultado.actualizadas += 1;
      } else if (existente && (existente.status === "new" || existente.status === "seen")) {
        await ds.matches.remove(existente.id);
        resultado.borradas += 1;
      }
    }
  }
  return resultado;
}

/** "Cumple 6 de las 7 cosas que busca". Las oportunidades viejas sin el dato lo deducen de la explicación. */
export function cumpleDeLas(reasons: MatchReasons): { cumple: number; total: number } {
  if (typeof reasons.cumple === "number" && typeof reasons.total === "number") {
    return { cumple: reasons.cumple, total: reasons.total };
  }
  const cumple = reasons.met.filter((m) => !m.startsWith("Además")).length;
  return { cumple, total: cumple + reasons.unconfirmed.length + reasons.unmet.length };
}
