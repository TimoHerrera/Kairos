import { z } from "zod";

/**
 * Lo que Kairos entiende de una nota sobre un cliente.
 * Todo es opcional (null o lista vacía): solo se completa lo que la nota dice.
 * Es la misma forma para el extractor de reglas (mock) y para Claude.
 */
export const NotaExtraida = z.strictObject({
  cliente: z.strictObject({
    nombre: z.string().nullable().describe("Nombre del cliente tal como lo dice la nota, o null"),
    telefono: z.string().nullable().describe("Teléfono si lo dice, como lo dijo, o null"),
  }),
  operacion: z.enum(["buy", "rent"]).nullable().describe("buy = compra, rent = alquiler"),
  tipo: z.enum(["apartment", "house", "ph", "land", "commercial", "other"]).nullable(),
  ambientes_min: z.number().int().nullable(),
  ambientes_max: z.number().int().nullable(),
  dormitorios: z.number().int().nullable(),
  barrio: z.string().nullable().describe("Barrio principal: Palermo, Belgrano, Villa Crespo…"),
  subzonas: z.array(z.string()).describe("Subzonas del barrio: Soho, Hollywood, Belgrano R…"),
  moneda: z.enum(["USD", "ARS"]).nullable(),
  presupuesto_max: z.number().nullable().describe("Tope en la moneda indicada: 180 mil dólares = 180000"),
  financiacion: z.enum(["cash", "preapproved_credit", "undefined"]).nullable(),
  mudanza_antes_de: z
    .string()
    .nullable()
    .describe("Mes límite de mudanza como YYYY-MM, o null"),
  le_importa: z.array(z.string()).describe("Lo que necesita sí o sí"),
  le_gustaria: z.array(z.string()).describe("Lo que suma pero no es imprescindible"),
  no_quiere: z.array(z.string()).describe("Lo que descarta de entrada"),
  descartes: z
    .array(
      z.strictObject({
        propiedad: z.string().describe("Cómo nombró la propiedad: 'Thames 1700', 'el de Santa Fe'"),
        motivo: z.string().describe("Por qué la descartó, con sus palabras"),
      }),
    )
    .describe("Propiedades que ya vio y descartó"),
});

export type NotaExtraida = z.infer<typeof NotaExtraida>;

export const NOTA_VACIA: NotaExtraida = {
  cliente: { nombre: null, telefono: null },
  operacion: null,
  tipo: null,
  ambientes_min: null,
  ambientes_max: null,
  dormitorios: null,
  barrio: null,
  subzonas: [],
  moneda: null,
  presupuesto_max: null,
  financiacion: null,
  mudanza_antes_de: null,
  le_importa: [],
  le_gustaria: [],
  no_quiere: [],
  descartes: [],
};

/** Lo que el cliente manda al servidor para extraer. Nada de teléfonos ni emails de la ficha. */
export const PedidoExtraccion = z.object({
  transcripcion: z.string().trim().min(3).max(8000),
  /** Para que la IA sepa qué ya está en la ficha y solo devuelva lo que cambia. */
  fichaActual: z
    .object({
      operacion: z.string().nullable(),
      tipo: z.string().nullable(),
      ambientes: z.string().nullable(),
      zona: z.string().nullable(),
      presupuesto: z.string().nullable(),
      financiacion: z.string().nullable(),
      le_importa: z.array(z.string()),
      no_quiere: z.array(z.string()),
    })
    .nullable(),
});

export type PedidoExtraccion = z.infer<typeof PedidoExtraccion>;

export type RespuestaExtraccion =
  | { ok: true; nota: NotaExtraida; proveedor: "mock" | "anthropic" }
  | { ok: false; error: string };
