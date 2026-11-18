import { NOTA_VACIA, type NotaExtraida } from "./schema";

/**
 * Extractor por reglas: el modo `mock` de la IA. Funciona sin claves ni red,
 * entiende las notas de la demo al pie de la letra y notas simples parecidas.
 * No pretende reemplazar a Claude: ante la duda, deja el dato vacío.
 */

const plano = (t: string) =>
  t
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

const NUMEROS: Record<string, number> = { un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6 };
const num = (t: string) => NUMEROS[t] ?? Number(t);

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

const BARRIOS = [
  "Palermo", "Belgrano", "Villa Crespo", "Caballito", "Colegiales", "Núñez", "Almagro", "Recoleta", "Barrio Norte",
  "Villa Urquiza", "Coghlan", "Saavedra", "Flores", "Boedo", "San Telmo", "Puerto Madero", "Retiro", "Chacarita",
  "Villa Devoto", "Villa del Parque", "Villa Ortúzar", "Parque Patricios", "Olivos", "Vicente López", "Martínez",
  "San Isidro", "Tigre", "Ramos Mejía", "Banfield", "Lanús", "Quilmes", "Adrogué",
];

/** Subzona → barrio al que pertenece. */
const SUBZONAS: Record<string, string> = {
  Soho: "Palermo",
  Hollywood: "Palermo",
  Chico: "Palermo",
  "Botánico": "Palermo",
  "Las Cañitas": "Belgrano",
  "Belgrano R": "Belgrano",
  "Belgrano C": "Belgrano",
};

/** Avenidas conocidas: un descarte "por el ruido" en una de estas es un "no quiere avenida". */
const AVENIDAS = ["santa fe", "cabildo", "corrientes", "rivadavia", "cordoba", "libertador", "las heras", "pueyrredon", "callao", "medrano", "lacroze", "scalabrini", "juan b. justo", "triunvirato", "alvear"];

const CARACTERISTICAS: Array<[string, RegExp]> = [
  ["balcon", /balcon/],
  ["luminoso", /luminos|mucha luz|luz natural/],
  ["planta_baja", /planta baja|\bpb\b/],
  ["sobre_avenida", /avenida/],
  ["cochera", /cochera|garage|garaje/],
  ["patio", /patio/],
  ["terraza", /terraza/],
  ["jardin", /jardin/],
  ["ascensor", /ascensor/],
  ["mascotas", /mascota|perro|gato/],
  ["pileta", /pileta/],
  ["silencioso", /silencios|tranquil/],
  ["a_refaccionar", /refaccion|reciclar/],
  ["contrafrente", /contrafrente/],
];

const NEGACION = /\b(no quiere|no le gusta|no acepta|nada de|nada que|odia|ni loco|evitar|no puede ser)\b/;
const DESCARTE = /descart|no le gusto|no le convenci|lo bocho|lo rechaz/;
const OPCIONAL = /\b(estaria bueno|si tiene|ideal(mente)?|le gustaria|seria un plus|suma)\b/;

function capitalizar(t: string) {
  const s = t.trim();
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

function agregar(lista: string[], valor: string) {
  if (!lista.includes(valor)) lista.push(valor);
}

function nombreDelCliente(texto: string): string | null {
  const m = texto.match(
    /\b(?:[Vv]i a|[Vv]i con|[Hh]abl[eé] con|[Ll]lam[eé] a|[Mm]e reun[ií] con|[Ee]stuve con|[Ss]e llama|[Cc]liente nuevo,?|[Cc]lienta nueva,?)\s+((?:[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)(?:\s+(?:y\s+)?[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){0,2})/,
  );
  return m ? m[1].trim() : null;
}

function telefono(texto: string): string | null {
  const m = texto.match(/(?:\+?54\s*)?(?:9\s*)?(?:0?\d{2,4})[\s-]*(?:15[\s-]*)?\d{3,4}[\s-]*\d{4}/);
  return m && m[0].replace(/\D/g, "").length >= 10 ? m[0].trim() : null;
}

function presupuesto(t: string, alquiler: boolean): { valor: number; moneda: "USD" | "ARS" } | null {
  const re =
    /\b(?:hasta|tope(?:\s+(?:de|a|en))?|presupuesto(?:\s+de)?|puede pagar|pagar)\s+(?:usd\s*|u\$s\s*|us\$\s*|\$\s*)?(\d{1,3}(?:[.,]\d{3})+|\d+(?:[.,]\d+)?)\s*(mil|k|lucas|millones?|palos?)?\s*(?:de\s+)?(dolares|usd|verdes|pesos)?/;
  const m = t.match(re);
  if (!m) return null;
  let crudo = m[1];
  // "180.000" es miles; "1,2" es decimal.
  crudo = /^\d{1,3}([.,]\d{3})+$/.test(crudo) ? crudo.replace(/[.,]/g, "") : crudo.replace(",", ".");
  let valor = Number(crudo);
  const escala = m[2];
  if (escala === "mil" || escala === "k" || escala === "lucas") valor *= 1_000;
  if (escala?.startsWith("millon") || escala?.startsWith("palo")) valor *= 1_000_000;
  if (!Number.isFinite(valor) || valor <= 0) return null;
  const pesos = m[3] === "pesos" || /\$\s*\d/.test(m[0].replace(/u\$s|us\$/, ""));
  const moneda = pesos || (alquiler && m[3] !== "dolares" && m[3] !== "usd" && m[3] !== "verdes") ? "ARS" : "USD";
  return { valor: Math.round(valor), moneda };
}

function mudanza(t: string, ahora: Date): string | null {
  const m = t.match(/antes de (?:fin de |fines de )?([a-z]+)(?: (?:de |del )?(\d{4}))?/);
  if (!m) return null;
  const mes = MESES.indexOf(m[1]);
  if (mes < 0) return null;
  let anio = m[2] ? Number(m[2]) : ahora.getFullYear();
  if (!m[2] && mes <= ahora.getMonth()) anio += 1;
  return `${anio}-${String(mes + 1).padStart(2, "0")}`;
}

/** "el de Thames", "lo de Santa Fe", "el departamento de Gorriti" → "Thames" */
function propiedadMencionada(oracion: string): string | null {
  const m = oracion.match(
    /\b(?:[Ee]l|[Ll]o|[Ll]a)\s+(?:depto\s+|departamento\s+|ph\s+|casa\s+)?(?:de|en|sobre)\s+((?:Av\.?\s+|Avenida\s+)?[A-ZÁÉÍÓÚÑ][\wáéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ\d][\wáéíóúñ]*)?(?:\s+\d{2,5})?)/,
  );
  if (!m) return null;
  const nombre = m[1].trim();
  // Un barrio no es una propiedad ("lo de Palermo").
  return BARRIOS.some((b) => plano(b) === plano(nombre)) ? null : nombre;
}

/** Motivo de un descarte con las palabras del agente: "pero es planta baja, y no quiere" → "Es planta baja". */
function motivo(oracion: string): string {
  const pero = oracion.match(/\bpero\s+(.+?)(?:,?\s+y\s+no\s+(?:quiere|le gusta).*)?$/i);
  if (pero) return capitalizar(pero[1].replace(/[.,;]+$/, ""));
  const por = oracion.match(/\bpor\s+(.+)$/i);
  if (por) return capitalizar(`por ${por[1]}`.replace(/[.,;]+$/, ""));
  return capitalizar(oracion.replace(/[.,;]+$/, ""));
}

export function extraerConReglas(texto: string, ahora: Date = new Date()): NotaExtraida {
  const nota: NotaExtraida = structuredClone(NOTA_VACIA);
  const t = plano(texto);

  nota.cliente.nombre = nombreDelCliente(texto);
  nota.cliente.telefono = telefono(texto);

  const alquiler = /\balquil/.test(t);
  if (alquiler) nota.operacion = "rent";
  else if (/\b(compra|comprar|busca|buscan)\b/.test(t)) nota.operacion = "buy";

  if (/\bph\b/.test(t)) nota.tipo = "ph";
  else if (/\bcasa\b/.test(t)) nota.tipo = "house";
  else if (/\bterreno\b/.test(t)) nota.tipo = "land";
  else if (/\blocal\b/.test(t)) nota.tipo = "commercial";
  else if (/\b(depto|departamento|monoambiente)\b/.test(t)) nota.tipo = "apartment";

  const rango = t.match(/\b(?:de\s+)?(\d|un|dos|tres|cuatro|cinco|seis)\s+(?:a|o)\s+(\d|dos|tres|cuatro|cinco|seis)\s+amb/);
  const ambientes = t.match(/\b(\d|un|dos|tres|cuatro|cinco|seis)\s+amb(?:iente)?s?\b/);
  if (/monoambiente/.test(t)) {
    nota.ambientes_min = nota.ambientes_max = 1;
  } else if (rango) {
    nota.ambientes_min = num(rango[1]);
    nota.ambientes_max = num(rango[2]);
  } else if (ambientes) {
    nota.ambientes_min = nota.ambientes_max = num(ambientes[1]);
  }
  if (nota.ambientes_min && !nota.tipo) nota.tipo = "apartment";

  const dorm = t.match(/\b(\d|un|dos|tres|cuatro)\s+(?:dormitorios?|cuartos?|habitaciones?)\b/);
  if (dorm) nota.dormitorios = num(dorm[1]);

  for (const [sub, barrio] of Object.entries(SUBZONAS)) {
    const p = plano(sub);
    // "Chico" solo cuenta como "Palermo Chico".
    const re = sub === "Chico" ? /palermo chico|\bchico\b(?=[^.]*palermo)|palermo[^.]*\bchico\b/ : new RegExp(`\\b${p}\\b`);
    if (re.test(t)) {
      agregar(nota.subzonas, sub);
      nota.barrio ??= barrio;
    }
  }
  if (!nota.barrio) {
    const enBarrio = BARRIOS.map((b) => ({ b, i: t.search(new RegExp(`\\b${plano(b)}\\b`)) }))
      .filter((x) => x.i >= 0)
      .sort((a, b) => a.i - b.i)[0];
    if (enBarrio) nota.barrio = enBarrio.b;
  }

  const tope = presupuesto(t, alquiler);
  if (tope) {
    nota.presupuesto_max = tope.valor;
    nota.moneda = tope.moneda;
  }

  if (/credito/.test(t) && /(pre)?aprobad/.test(t)) nota.financiacion = "preapproved_credit";
  else if (/\b(contado|cash|efectivo|sin credito)\b/.test(t)) nota.financiacion = "cash";

  nota.mudanza_antes_de = mudanza(t, ahora);

  // Oración por oración: lo que quiere, lo que no, y lo que descartó.
  const oraciones = texto.split(/(?<=[.;!?])\s+|\n+/).filter((o) => o.trim());
  let ultimaPropiedad: string | null = null;
  for (const oracion of oraciones) {
    const o = plano(oracion);
    const propiedad = propiedadMencionada(oracion);

    if (DESCARTE.test(o)) {
      const cual = propiedad ?? ultimaPropiedad;
      if (cual) {
        nota.descartes.push({ propiedad: cual, motivo: motivo(oracion) });
        // Descartó una avenida por el ruido: no quiere avenidas.
        if (/ruid/.test(o) && AVENIDAS.some((a) => plano(cual).includes(a))) agregar(nota.no_quiere, "sobre_avenida");
      }
      ultimaPropiedad = null;
      continue;
    }

    const negativa = NEGACION.test(o);
    const caracteristicas = CARACTERISTICAS.filter(([, re]) => re.test(o)).map(([clave]) => clave);

    if (negativa && ultimaPropiedad && !propiedad) {
      // "Recién vi el de Thames. Le gustó la zona pero es planta baja, y no quiere."
      nota.descartes.push({ propiedad: ultimaPropiedad, motivo: motivo(oracion) });
      ultimaPropiedad = null;
    } else if (propiedad) {
      ultimaPropiedad = propiedad;
    }

    for (const clave of caracteristicas) {
      if (negativa) agregar(nota.no_quiere, clave);
      else if (OPCIONAL.test(o)) agregar(nota.le_gustaria, clave);
      else if (/\b(busca|buscan|quiere|quieren|tenga|necesita|necesitan|sea|importa|si o si)\b/.test(o)) agregar(nota.le_importa, clave);
    }
  }

  // Lo que no quiere no puede estar también en lo que quiere.
  nota.le_importa = nota.le_importa.filter((c) => !nota.no_quiere.includes(c));
  nota.le_gustaria = nota.le_gustaria.filter((c) => !nota.no_quiere.includes(c) && !nota.le_importa.includes(c));
  return nota;
}
