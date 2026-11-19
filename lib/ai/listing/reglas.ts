import { AVENIDAS, BARRIOS, CARACTERISTICAS_RE, SUBZONAS } from "@/lib/ai/extract/reglas";
import type { AvisoExtraido } from "./schema";

/**
 * Lector de avisos por reglas: el modo `mock` de "Pegar el aviso".
 * Entiende el formato habitual de Zonaprop, Argenprop y MercadoLibre copiado a mano.
 * Lo que no encuentra queda en null y va a `dudas` para que el agente lo complete.
 */

const plano = (t: string) =>
  t
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

/** "172.000" → 172000; "1.250.000" → 1250000; "72,5" → 72.5 */
function numero(crudo: string): number {
  const t = crudo.trim();
  if (/^\d{1,3}([.]\d{3})+$/.test(t)) return Number(t.replace(/\./g, ""));
  if (/^\d{1,3}(,\d{3})+$/.test(t)) return Number(t.replace(/,/g, ""));
  return Number(t.replace(",", "."));
}

const NO_CALLES = /^(usd|u\$s|us\$|expensas|precio|venta|alquiler|departamento|depto|casa|ph|ambientes?|piso|dormitorios?|m2|superficie|orientacion)$/i;

function direccion(texto: string): string | null {
  // Se busca oración por oración, para no pegar el final de una con la calle de la siguiente.
  // Las abreviaturas ("Av.", "Gral.") no cortan la oración.
  const segmentos = texto
    .replace(/\b(Av|Avda|Gral|Dr|Pte|Sta|Sto)\.\s*/g, "$1§ ")
    .split(/[.\n;|·•]\s*/)
    .map((s) => s.replace(/§/g, "."));
  // Calle (palabras con mayúscula) + altura.
  const re =
    /(?<![A-Za-zÁÉÍÓÚÑáéíóúñü])((?:(?:Av|Avda|Gral|Dr|Pte|Sta|Sto)\.?[ \t]+|Avenida[ \t]+)?[A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚÑáéíóúñü]+(?:[ \t]+(?:de[ \t]+)?[A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚÑáéíóúñü]+){0,3})[ \t]+(?:al[ \t]+)?(\d{2,5})\b/g;
  for (const m of segmentos.flatMap((s) => [...s.matchAll(re)])) {
    const calle = m[1].trim();
    const primera = calle.split(/\s+/)[0].replace(/\.$/, "");
    if (NO_CALLES.test(plano(primera)) || NO_CALLES.test(plano(calle))) continue;
    if (BARRIOS.some((b) => plano(b) === plano(calle))) continue;
    return `${calle.replace(/^Avda\.?|^Avenida/, "Av.")} ${m[2]}`.replace(/^Av\s/, "Av. ");
  }
  return null;
}

export function leerAvisoConReglas(texto: string, url: string | null = null): AvisoExtraido {
  const t = plano(texto);
  const dudas: string[] = [];

  // Precio: primero el que dice USD; si no, un $ que no sea de expensas.
  let precio: number | null = null;
  let moneda: "USD" | "ARS" | null = null;
  const usd = t.match(/(?:usd|u\$s|us\$|u\$d|dolares)\s*:?\s*(\d{1,3}(?:[.,]\d{3})+|\d{4,})/);
  if (usd) {
    precio = numero(usd[1]);
    moneda = "USD";
  } else {
    for (const m of t.matchAll(/(?<!expensas[^\n]{0,15})\$\s*(\d{1,3}(?:[.,]\d{3})+|\d{4,})/g)) {
      const antes = t.slice(Math.max(0, (m.index ?? 0) - 20), m.index);
      if (/expensa/.test(antes)) continue;
      precio = numero(m[1]);
      moneda = "ARS";
      break;
    }
  }

  const exp = t.match(/expensas\s*(?:mensuales)?\s*:?\s*\$?\s*(\d{1,3}(?:[.,]\d{3})+|\d{3,})/);
  const expensas = exp ? numero(exp[1]) : null;

  const operacion: AvisoExtraido["operacion"] = /\balquil|\/mes\b|por mes/.test(t) ? "rent" : /\bventa\b|\bvende|\bcompra/.test(t) || moneda === "USD" ? "buy" : null;

  let tipo: AvisoExtraido["tipo"] = null;
  if (/\bph\b/.test(t)) tipo = "ph";
  else if (/\bcasa\b/.test(t)) tipo = "house";
  else if (/\blote\b|\bterreno\b/.test(t)) tipo = "land";
  else if (/\blocal\b|\boficina\b/.test(t)) tipo = "commercial";
  else if (/\b(departamento|depto|dpto|monoambiente|amb)/.test(t)) tipo = "apartment";

  const amb = t.match(/\b(\d{1,2})\s*amb(?:ientes?|s?\.?)?\b/);
  const ambientes = /monoambiente/.test(t) ? 1 : amb ? Number(amb[1]) : null;
  const dorm = t.match(/\b(\d{1,2})\s*(?:dormitorios?|dorm\.?|habitaciones?)\b/);

  const cub = t.match(/(\d+(?:[.,]\d+)?)\s*m(?:²|2|ts2?)\s*(?:cub|cubiertos?)/);
  const tot = t.match(/(\d+(?:[.,]\d+)?)\s*m(?:²|2|ts2?)\s*(?:tot|totales?)/);
  const cualquiera = t.match(/(\d+(?:[.,]\d+)?)\s*m(?:²|2)\b/);
  const m2_cubiertos = cub ? numero(cub[1]) : !tot && cualquiera ? numero(cualquiera[1]) : null;
  const m2_totales = tot ? numero(tot[1]) : null;

  let piso: number | null = null;
  if (/planta baja|\bpb\b/.test(t)) piso = 0;
  else {
    const p = t.match(/\b(\d{1,2})\s*(?:º|°|o|er|do|ro|to|vo|no)?\s*piso\b/) ?? t.match(/\bpiso\s*:?\s*(\d{1,2})\b/);
    if (p) piso = Number(p[1]);
  }

  const orientacion = t.match(/orientaci[oó]n\s*:?\s*(noreste|noroeste|sureste|suroeste|norte|sur|este|oeste)/)?.[1] ?? null;

  const dir = direccion(texto);
  let barrio: string | null = null;
  let subzona: string | null = null;
  for (const [sub, b] of Object.entries(SUBZONAS)) {
    const re = sub === "Chico" ? /palermo chico/ : new RegExp(`\\b${plano(sub)}\\b`);
    if (re.test(t)) {
      subzona = sub;
      barrio = b;
      break;
    }
  }
  if (!barrio) {
    const enBarrio = BARRIOS.map((b) => ({ b, i: t.search(new RegExp(`\\b${plano(b)}\\b`)) }))
      .filter((x) => x.i >= 0)
      .sort((a, b) => a.i - b.i)[0];
    barrio = enBarrio?.b ?? null;
  }

  const sinBalcon = /sin balcon/.test(t);
  const balcon = sinBalcon ? false : /balcon/.test(t) ? true : null;
  const dirPlana = plano(dir ?? "");
  const sobre_avenida =
    /^av\.?\s|^avenida\s/.test(dirPlana) || AVENIDAS.some((a) => dirPlana.startsWith(a)) ? true : /sobre avenida/.test(t) ? true : dir ? false : null;

  let apto_credito: AvisoExtraido["apto_credito"] = "unconfirmed";
  if (/no\s+(?:es\s+)?apto\s+cr[eé]dito|no apta credito/.test(t)) apto_credito = "no";
  else if (/apto\s+cr[eé]dito|apta\s+credito/.test(t)) apto_credito = "yes";

  const amenities = CARACTERISTICAS_RE.filter(
    ([clave, re]) => !["balcon", "planta_baja", "sobre_avenida"].includes(clave) && re.test(t),
  ).map(([clave]) => clave);

  if (!dir) dudas.push("direccion");
  if (!barrio) dudas.push("barrio");
  if (!precio) dudas.push("precio");
  if (!ambientes) dudas.push("ambientes");
  if (piso === null) dudas.push("piso");
  if (apto_credito === "unconfirmed") dudas.push("apto_credito");
  if (url && !operacion) dudas.push("operacion");

  return {
    direccion: dir,
    barrio,
    subzona,
    operacion,
    tipo,
    precio,
    moneda,
    expensas,
    ambientes,
    dormitorios: dorm ? Number(dorm[1]) : null,
    m2_cubiertos,
    m2_totales,
    piso,
    orientacion: orientacion ? orientacion[0].toUpperCase() + orientacion.slice(1) : null,
    balcon,
    sobre_avenida,
    apto_credito,
    amenities,
    dudas,
  };
}
