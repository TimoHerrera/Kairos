import "server-only";
import { proveedorIA } from "@/lib/ai/extract";
import { redactarConPlantilla } from "./plantilla";
import type { PedidoMensaje, RespuestaMensaje } from "./schema";

/** Prompt para redactar el mensaje con Claude (proveedor real: fase 7). */
export const SISTEMA_MENSAJE = `Redactás mensajes de WhatsApp de un agente inmobiliario argentino a su cliente para ofrecerle una propiedad.
- Español rioplatense con vos (o de usted si el tono es "formal"), cálido y breve, sin emojis ni lenguaje de vendedor.
- Empezá por por qué le sirve a esa persona; nombrá la dirección como se dice en Buenos Aires ("Gorriti al 4800"), los ambientes y el precio tal cual te lo paso.
- Mencioná lo que evita de lo que no quiere (por ejemplo "No es planta baja ni da a avenida").
- No afirmes nada que no esté en los datos.
- Cerrá proponiendo verla esta semana.
- Tono "shorter": dos frases como máximo. Tono "formal": de usted.
- Si "fotos" es true y hay link, terminá con una línea que comparta el link.
- Devolvé solo el texto del mensaje.`;

export async function redactarMensaje(pedido: PedidoMensaje): Promise<RespuestaMensaje> {
  if (proveedorIA() === "anthropic") {
    // El proveedor de Claude se conecta en la fase 7; mientras tanto, la plantilla.
    return { ok: true, texto: redactarConPlantilla(pedido), proveedor: "mock" };
  }
  return { ok: true, texto: redactarConPlantilla(pedido), proveedor: "mock" };
}
