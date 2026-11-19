import { z } from "zod";

/**
 * Lo que Kairos saca de un aviso pegado. Todo puede quedar en null: el agente revisa y completa antes de guardar.
 * `dudas` nombra los campos que conviene revisar.
 */
export const AvisoExtraido = z.strictObject({
  direccion: z.string().nullable().describe("Calle y altura: 'Gorriti 4800', 'Av. Santa Fe 3900'"),
  barrio: z.string().nullable(),
  subzona: z.string().nullable(),
  operacion: z.enum(["buy", "rent"]).nullable(),
  tipo: z.enum(["apartment", "house", "ph", "land", "commercial", "other"]).nullable(),
  precio: z.number().nullable(),
  moneda: z.enum(["USD", "ARS"]).nullable(),
  expensas: z.number().nullable().describe("Expensas mensuales en pesos"),
  ambientes: z.number().int().nullable(),
  dormitorios: z.number().int().nullable(),
  m2_cubiertos: z.number().nullable(),
  m2_totales: z.number().nullable(),
  piso: z.number().int().nullable().describe("0 es planta baja"),
  orientacion: z.string().nullable(),
  balcon: z.boolean().nullable(),
  sobre_avenida: z.boolean().nullable(),
  apto_credito: z.enum(["yes", "no", "unconfirmed"]).nullable(),
  amenities: z.array(z.string()),
  dudas: z.array(z.string()).describe("Campos que el agente debería revisar"),
});

export type AvisoExtraido = z.infer<typeof AvisoExtraido>;

export const PedidoAviso = z.object({
  texto: z.string().trim().min(20).max(12000),
  url: z.string().trim().url().nullable(),
});

export type PedidoAviso = z.infer<typeof PedidoAviso>;

export type RespuestaAviso = { ok: true; aviso: AvisoExtraido; proveedor: "mock" | "anthropic" } | { ok: false; error: string };
