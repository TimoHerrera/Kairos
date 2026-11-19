import "server-only";
import { mensajeExtraccion, SISTEMA_EXTRACCION } from "./prompt";
import { extraerConReglas } from "./reglas";
import { NotaExtraida, type PedidoExtraccion, type RespuestaExtraccion } from "./schema";

export type ProveedorIA = "mock" | "anthropic";

/**
 * AI_PROVIDER=anthropic usa Claude, si hay una clave (ANTHROPIC_API_KEY).
 * Sin clave, o con cualquier otro valor, las reglas locales: la app funciona entera sin IA.
 */
export function proveedorIA(): ProveedorIA {
  return process.env.AI_PROVIDER === "anthropic" && process.env.ANTHROPIC_API_KEY ? "anthropic" : "mock";
}

/** Pasa una nota a datos de ficha. Siempre del lado del servidor: las claves nunca llegan al navegador. */
export async function extraerNota(pedido: PedidoExtraccion, hoy: Date = new Date()): Promise<RespuestaExtraccion> {
  if (proveedorIA() === "anthropic") {
    const { pedirJson } = await import("@/lib/ai/claude");
    const r = await pedirJson({ sistema: SISTEMA_EXTRACCION, mensaje: mensajeExtraccion(pedido, hoy), esquema: NotaExtraida });
    // Si la IA falla dos veces, la app muestra la transcripción para completar a mano.
    return r.ok ? { ok: true, nota: r.datos, proveedor: "anthropic" } : { ok: false, error: r.error };
  }
  return { ok: true, nota: extraerConReglas(pedido.transcripcion, hoy), proveedor: "mock" };
}
