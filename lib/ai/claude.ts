import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod";

/**
 * Llamadas a Claude, siempre del lado del servidor.
 * - Modelo por env (ANTHROPIC_MODEL), por defecto claude-sonnet-5-5.
 * - Salida JSON validada con Zod (structured outputs); si falla, un reintento.
 * - Fallbacks del servidor ("default"): si el modelo declina por política, el pedido se reintenta en otro modelo.
 * - Esfuerzo bajo: son tareas cortas de extracción y redacción.
 */

export const MODELO = process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5";
const BETA_FALLBACK = "server-side-fallback-2026-07-01";

/** Lo mínimo del cliente que usamos; permite pasar uno de prueba en los tests. */
export type ClienteClaude = Pick<Anthropic, "beta">;

let instancia: Anthropic | null = null;
function clientePorDefecto(): ClienteClaude {
  instancia ??= new Anthropic({ timeout: 60_000, maxRetries: 2 });
  return instancia;
}

export type ResultadoClaude<T> = { ok: true; datos: T } | { ok: false; error: string };

function errorLegible(e: unknown): string | null {
  if (e instanceof Anthropic.AuthenticationError || e instanceof Anthropic.PermissionDeniedError) {
    return "La clave de la IA no es válida. Revisá ANTHROPIC_API_KEY.";
  }
  if (e instanceof Anthropic.RateLimitError) return "La IA está con mucha demanda. Probá en un minuto.";
  if (e instanceof Anthropic.BadRequestError) return "La IA no aceptó el pedido.";
  return null;
}

/** Pide un JSON con la forma del esquema. Reintenta una vez si no valida. */
export async function pedirJson<T>(
  opciones: { sistema: string; mensaje: string; esquema: z.ZodType<T>; maxTokens?: number },
  cliente: ClienteClaude = clientePorDefecto(),
): Promise<ResultadoClaude<T>> {
  let ultimoError = "La IA no devolvió datos válidos.";
  for (let intento = 0; intento < 2; intento++) {
    try {
      const r = await cliente.beta.messages.parse({
        model: MODELO,
        max_tokens: opciones.maxTokens ?? 4000,
        betas: [BETA_FALLBACK],
        fallbacks: "default",
        system: [{ type: "text", text: opciones.sistema, cache_control: { type: "ephemeral" } }],
        messages: [{ role: "user", content: opciones.mensaje }],
        output_config: { effort: "low", format: betaZodOutputFormat(opciones.esquema) },
      });
      if (r.stop_reason === "refusal") return { ok: false, error: "La IA no quiso procesar esta nota." };
      const validado = opciones.esquema.safeParse(r.parsed_output);
      if (validado.success) return { ok: true, datos: validado.data };
      ultimoError = "La IA devolvió datos con otra forma.";
    } catch (e) {
      const legible = errorLegible(e);
      // Una clave mala o un pedido rechazado no se arreglan reintentando.
      if (legible) return { ok: false, error: legible };
      ultimoError = "No pudimos conectarnos con la IA.";
    }
  }
  return { ok: false, error: ultimoError };
}

/** Pide un texto libre (el mensaje de WhatsApp). */
export async function pedirTexto(
  opciones: { sistema: string; mensaje: string; maxTokens?: number },
  cliente: ClienteClaude = clientePorDefecto(),
): Promise<ResultadoClaude<string>> {
  try {
    const r = await cliente.beta.messages.create({
      model: MODELO,
      max_tokens: opciones.maxTokens ?? 2000,
      betas: [BETA_FALLBACK],
      fallbacks: "default",
      system: [{ type: "text", text: opciones.sistema, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: opciones.mensaje }],
      output_config: { effort: "low" },
    });
    if (r.stop_reason === "refusal") return { ok: false, error: "La IA no quiso redactar este mensaje." };
    const texto = r.content
      .flatMap((b) => (b.type === "text" ? [b.text] : []))
      .join("")
      .trim();
    return texto ? { ok: true, datos: texto } : { ok: false, error: "La IA devolvió un mensaje vacío." };
  } catch (e) {
    return { ok: false, error: errorLegible(e) ?? "No pudimos conectarnos con la IA." };
  }
}
