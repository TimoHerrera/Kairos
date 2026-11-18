import "server-only";
import { extraerConReglas } from "./reglas";
import type { PedidoExtraccion, RespuestaExtraccion } from "./schema";

export type ProveedorIA = "mock" | "anthropic";

/** AI_PROVIDER=anthropic usa Claude (necesita ANTHROPIC_API_KEY); cualquier otro valor, las reglas locales. */
export function proveedorIA(): ProveedorIA {
  return process.env.AI_PROVIDER === "anthropic" ? "anthropic" : "mock";
}

/** Pasa una nota a datos de ficha. Siempre del lado del servidor: las claves nunca llegan al navegador. */
export async function extraerNota(pedido: PedidoExtraccion, hoy: Date = new Date()): Promise<RespuestaExtraccion> {
  if (proveedorIA() === "anthropic") {
    // El proveedor de Claude (SDK oficial, salida validada con Zod y un reintento) se conecta en la fase 7.
    // El prompt ya está en ./prompt.ts. Hasta entonces, avisamos en vez de inventar.
    return { ok: false, error: "La IA real todavía no está conectada. Usá AI_PROVIDER=mock." };
  }
  return { ok: true, nota: extraerConReglas(pedido.transcripcion, hoy), proveedor: "mock" };
}
