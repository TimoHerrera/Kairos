import { z } from "zod";

export const TONOS = ["normal", "shorter", "formal"] as const;
export type Tono = (typeof TONOS)[number];

/**
 * Lo mínimo para redactar el mensaje: el nombre de pila del cliente y la propiedad.
 * Nada de teléfono, email ni notas del cliente.
 */
export const PedidoMensaje = z.object({
  tono: z.enum(TONOS),
  fotos: z.boolean(),
  nombre: z.string().trim().min(1).max(60),
  propiedad: z.object({
    tipo: z.enum(["apartment", "house", "ph", "land", "commercial", "other"]),
    ambientes: z.number().int().min(1).max(20),
    direccion: z.string().max(120),
    zona: z.string().max(120),
    piso: z.number().int().nullable(),
    balcon: z.boolean(),
    luminoso: z.boolean(),
    orientacion: z.string().max(20).nullable(),
    precio: z.string().max(40),
    url: z.string().url().nullable(),
  }),
  /** Lo que no quiere y esta propiedad evita: "planta_baja", "sobre_avenida". */
  evita: z.array(z.string().max(40)).max(10),
});

export type PedidoMensaje = z.infer<typeof PedidoMensaje>;

export type RespuestaMensaje = { ok: true; texto: string; proveedor: "mock" | "anthropic" } | { ok: false; error: string };
