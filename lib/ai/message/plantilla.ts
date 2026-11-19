import type { PedidoMensaje } from "./schema";

/**
 * Redacción del mensaje sin IA (modo mock): plantillas en rioplatense, una por tono.
 * Nunca afirma lo que está "a confirmar": solo usa datos de la propiedad y lo que el cliente no quiere.
 */

/** "Gorriti 4800" → "Gorriti al 4800", como se dice en Buenos Aires. */
export function alturaHablada(direccion: string): string {
  return direccion.replace(/^(.*\D)\s+(\d{2,5})$/, "$1 al $2");
}

function queEs(p: PedidoMensaje["propiedad"], articulo: boolean): string {
  const amb = `${p.ambientes} ${p.ambientes === 1 ? "ambiente" : "ambientes"}`;
  switch (p.tipo) {
    case "house":
      return articulo ? "una casa" : "casa";
    case "ph":
      return articulo ? `un PH de ${amb}` : `PH de ${amb}`;
    case "apartment":
      return articulo ? `un ${amb}` : amb;
    default:
      return articulo ? "una propiedad" : "propiedad";
  }
}

function piso(p: PedidoMensaje["propiedad"]): string | null {
  if (p.piso === null || p.piso === 0) return null;
  return `${p.piso}º piso`;
}

/** "No es planta baja ni da a avenida." */
function loQueEvita(evita: string[], formal: boolean): string | null {
  const partes: string[] = [];
  if (evita.includes("planta_baja")) partes.push("planta baja");
  if (evita.includes("sobre_avenida")) partes.push(formal ? "sobre avenida" : "da a avenida");
  if (!partes.length) return null;
  if (partes.length === 1) return evita.includes("sobre_avenida") && !formal ? "No da a avenida." : `No es ${partes[0]}.`;
  return formal ? `No es ${partes[0]} ni está ${partes[1]}.` : `No es ${partes[0]} ni ${partes[1]}.`;
}

function detalles(p: PedidoMensaje["propiedad"], formal: boolean): string {
  const elementos: string[] = [];
  const pis = piso(p);
  if (pis) elementos.push(`un ${pis}${p.balcon ? " con balcón" : ""}`);
  else if (p.balcon) elementos.push("tiene balcón");
  if (p.luminoso) {
    const luz = formal ? "muy luminoso" : "súper luminoso";
    elementos.push(p.orientacion ? `${luz} (orientación ${p.orientacion.toLowerCase()})` : luz);
  }
  return elementos.join(", ");
}

export function redactarConPlantilla(pedido: PedidoMensaje): string {
  const p = pedido.propiedad;
  const lugar = `${alturaHablada(p.direccion)}, ${p.zona}`;
  let texto: string;

  if (pedido.tono === "shorter") {
    const extra = [piso(p), p.balcon ? "con balcón" : null, p.luminoso ? "luminoso" : null].filter(Boolean).join(", ");
    texto = `Hola ${pedido.nombre}! Entró ${queEs(p, true)} en ${lugar}${extra ? `: ${extra}` : ""}, ${p.precio}. ¿Lo querés ver esta semana?`;
  } else if (pedido.tono === "formal") {
    const det = detalles(p, true);
    texto = [
      `Hola ${pedido.nombre}, ¿cómo está? Le escribo porque ingresó una propiedad que se ajusta a lo que busca: ${queEs(p, false)} en ${lugar}.`,
      det ? `Es ${det.replace(/^tiene /, "con ")}, a ${p.precio}.` : `Está a ${p.precio}.`,
      loQueEvita(pedido.evita, true),
      "¿Le interesaría coordinar una visita esta semana? Quedo a disposición.",
    ]
      .filter(Boolean)
      .join(" ");
  } else {
    const det = detalles(p, false);
    texto = [
      `Hola ${pedido.nombre}, acaba de entrar algo que encaja con lo que buscás: ${queEs(p, false)} en ${lugar}.`,
      det ? `Es ${det.replace(/^tiene /, "con ")} y está en ${p.precio}.` : `Está en ${p.precio}.`,
      loQueEvita(pedido.evita, false),
      "¿Te gustaría verlo esta semana?",
    ]
      .filter(Boolean)
      .join(" ");
  }

  if (pedido.fotos && p.url) {
    texto += pedido.tono === "formal" ? `\n\nLe comparto las fotos y todos los datos: ${p.url}` : `\n\nTe paso las fotos y todos los datos: ${p.url}`;
  }
  return texto;
}
