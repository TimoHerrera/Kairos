import demo from "@/lib/data/seed/demo.json";

/**
 * Lo que "escucha" la transcripción en modo mock (TRANSCRIBE_PROVIDER=mock): textos fijos de la demo,
 * para presentar el flujo completo sin micrófono ni claves.
 */
export const NOTA_MARTINA = demo.buyers.find((b) => b.key === "martina")!.note!.transcript;

export const NOTA_CLIENTE_NUEVO =
  "Recién vi a Juan Rodríguez, un cliente nuevo. Busca 2 ambientes en Belgrano, hasta 150 mil dólares, que tenga balcón. No quiere nada sobre avenida. Paga de contado y quiere mudarse antes de junio. Su celular es 11 5555 0110.";

/**
 * Elige el guion según a quién va la nota:
 * - Cliente nuevo y Martina todavía no existe: la nota del prototipo, para recrear la demo desde cero.
 * - Cliente nuevo y Martina ya existe: un cliente nuevo distinto.
 * - Martina: la actualización del ejemplo ("subió el tope").
 * - Otro cliente: una actualización genérica.
 */
export function guionMock(destino: { nombre: string } | null, existeMartina: boolean): string {
  if (!destino) return existeMartina ? NOTA_CLIENTE_NUEVO : NOTA_MARTINA;
  const primer = destino.nombre.split(" ")[0];
  if (primer === "Martina") return "Hablé con Martina. Subió el tope a 185 mil y ahora también quiere cochera.";
  return `Hablé con ${primer}. Me dijo que ahora le importa que tenga cochera y que no quiere planta baja.`;
}
