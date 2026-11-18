import { NextResponse } from "next/server";

/**
 * POST /api/ai/transcribe — transcripción del lado del servidor (TRANSCRIBE_PROVIDER=openai).
 * Recibe el audio en `audio` (multipart) y devuelve el texto. El audio no se guarda.
 * En los modos `webspeech` y `mock` la transcripción ocurre en el navegador y esta ruta no se usa.
 */
const LIMITE_BYTES = 25 * 1024 * 1024;

type Respuesta = { ok: true; texto: string } | { ok: false; error: string };

export async function POST(request: Request) {
  const clave = process.env.OPENAI_API_KEY;
  if (process.env.TRANSCRIBE_PROVIDER !== "openai" || !clave) {
    return NextResponse.json<Respuesta>(
      { ok: false, error: "La transcripción en el servidor no está configurada." },
      { status: 501 },
    );
  }

  let audio: File | null = null;
  try {
    const datos = await request.formData();
    const archivo = datos.get("audio");
    audio = archivo instanceof File ? archivo : null;
  } catch {
    audio = null;
  }
  if (!audio || audio.size === 0) {
    return NextResponse.json<Respuesta>({ ok: false, error: "No llegó el audio." }, { status: 400 });
  }
  if (audio.size > LIMITE_BYTES) {
    return NextResponse.json<Respuesta>({ ok: false, error: "El audio es demasiado largo." }, { status: 413 });
  }

  const pedido = new FormData();
  pedido.append("file", audio, audio.name || "nota.webm");
  pedido.append("model", process.env.OPENAI_TRANSCRIBE_MODEL || "whisper-1");
  pedido.append("language", "es");
  pedido.append("response_format", "json");

  try {
    const r = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${clave}` },
      body: pedido,
    });
    if (!r.ok) {
      console.error("Transcripción: el proveedor respondió", r.status);
      return NextResponse.json<Respuesta>({ ok: false, error: "No pudimos transcribir el audio." }, { status: 502 });
    }
    const json = (await r.json()) as { text?: string };
    const texto = json.text?.trim();
    if (!texto) return NextResponse.json<Respuesta>({ ok: false, error: "No se entendió nada en el audio." }, { status: 422 });
    return NextResponse.json<Respuesta>({ ok: true, texto });
  } catch {
    return NextResponse.json<Respuesta>({ ok: false, error: "No pudimos transcribir el audio." }, { status: 502 });
  }
}
