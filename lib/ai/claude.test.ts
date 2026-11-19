import Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it, vi } from "vitest";
import { pedirJson, pedirTexto, type ClienteClaude } from "./claude";
import { NotaExtraida, NOTA_VACIA } from "./extract/schema";

/** Un cliente falso: devuelve en orden las respuestas (o errores) que le pasamos. */
function falso(respuestas: Array<unknown>) {
  const cola = [...respuestas];
  const siguiente = async () => {
    const r = cola.shift();
    if (r instanceof Error) throw r;
    return r;
  };
  const parse = vi.fn(siguiente);
  const create = vi.fn(siguiente);
  return { cliente: { beta: { messages: { parse, create } } } as unknown as ClienteClaude, parse, create };
}

const valida = { ...NOTA_VACIA, cliente: { nombre: "Martina", telefono: null }, barrio: "Palermo", presupuesto_max: 180000, moneda: "USD" };
const pedido = { sistema: "s", mensaje: "m", esquema: NotaExtraida };

/** Un error del SDK sin pasar por su constructor (solo nos importa la clase). */
const errorDe = <T extends object>(Clase: { prototype: T }) => Object.assign(Object.create(Clase.prototype), { message: "x" }) as Error;

describe("pedirJson", () => {
  it("devuelve lo que validó Zod", async () => {
    const { cliente, parse } = falso([{ stop_reason: "end_turn", parsed_output: valida }]);
    const r = await pedirJson(pedido, cliente);
    expect(r).toEqual({ ok: true, datos: valida });
    const pedidoEnviado = (parse.mock.calls[0] as unknown[])[0] as Record<string, unknown>;
    expect(pedidoEnviado).toMatchObject({ model: "claude-sonnet-5-5", fallbacks: "default", betas: ["server-side-fallback-2026-07-01"] });
  });

  it("si la forma no valida, reintenta una vez", async () => {
    const { cliente, parse } = falso([
      { stop_reason: "end_turn", parsed_output: { barrio: 3 } },
      { stop_reason: "end_turn", parsed_output: valida },
    ]);
    expect(await pedirJson(pedido, cliente)).toEqual({ ok: true, datos: valida });
    expect(parse).toHaveBeenCalledTimes(2);
  });

  it("si falla dos veces, avisa para completar a mano", async () => {
    const { cliente, parse } = falso([
      { stop_reason: "end_turn", parsed_output: null },
      { stop_reason: "end_turn", parsed_output: null },
    ]);
    expect(await pedirJson(pedido, cliente)).toEqual({ ok: false, error: "La IA devolvió datos con otra forma." });
    expect(parse).toHaveBeenCalledTimes(2);
  });

  it("una clave mala no se reintenta", async () => {
    const { cliente, parse } = falso([errorDe(Anthropic.AuthenticationError)]);
    expect(await pedirJson(pedido, cliente)).toEqual({ ok: false, error: "La clave de la IA no es válida. Revisá ANTHROPIC_API_KEY." });
    expect(parse).toHaveBeenCalledTimes(1);
  });

  it("un corte de red sí se reintenta", async () => {
    const { cliente } = falso([new Error("ECONNRESET"), { stop_reason: "end_turn", parsed_output: valida }]);
    expect(await pedirJson(pedido, cliente)).toEqual({ ok: true, datos: valida });
  });

  it("si la IA declina, lo dice sin reintentar", async () => {
    const { cliente, parse } = falso([{ stop_reason: "refusal", parsed_output: null }]);
    expect(await pedirJson(pedido, cliente)).toEqual({ ok: false, error: "La IA no quiso procesar esta nota." });
    expect(parse).toHaveBeenCalledTimes(1);
  });
});

describe("pedirTexto", () => {
  it("junta los bloques de texto", async () => {
    const { cliente } = falso([{ stop_reason: "end_turn", content: [{ type: "thinking", thinking: "" }, { type: "text", text: "Hola Martina, " }, { type: "text", text: "entró algo." }] }]);
    expect(await pedirTexto({ sistema: "s", mensaje: "m" }, cliente)).toEqual({ ok: true, datos: "Hola Martina, entró algo." });
  });
  it("sin texto, error", async () => {
    const { cliente } = falso([{ stop_reason: "end_turn", content: [] }]);
    expect((await pedirTexto({ sistema: "s", mensaje: "m" }, cliente)).ok).toBe(false);
  });
});
