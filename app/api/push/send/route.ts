import { NextResponse } from "next/server";
import { z } from "zod";
import { enviarPush, esServicioDePush } from "@/lib/push/webpush";

/**
 * POST /api/push/send — manda un aviso push a una suscripción.
 * En modo mock la suscripción vive en el navegador, así que viene en el pedido.
 * Para que no sirva de relé: solo servicios de push conocidos y un contenido acotado.
 * Con Supabase (fase 7) la suscripción sale de la base, por agente.
 */
const Pedido = z.object({
  suscripcion: z.object({
    endpoint: z.string().url().max(1000),
    keys: z.object({ p256dh: z.string().min(80).max(120), auth: z.string().min(16).max(40) }),
  }),
  aviso: z.object({
    title: z.string().min(1).max(80),
    body: z.string().max(240),
    url: z.string().regex(/^\/[\w\-/?=&.%]*$/, "Solo rutas internas").max(200),
    tag: z.string().max(80).optional(),
  }),
});

export async function POST(request: Request) {
  const publica = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privada = process.env.VAPID_PRIVATE_KEY;
  if (!publica || !privada) {
    return NextResponse.json({ ok: false, error: "Los avisos push no están configurados." }, { status: 501 });
  }

  let cuerpo: unknown;
  try {
    cuerpo = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "El pedido no es JSON." }, { status: 400 });
  }
  const pedido = Pedido.safeParse(cuerpo);
  if (!pedido.success || !esServicioDePush(pedido.data.suscripcion.endpoint)) {
    return NextResponse.json({ ok: false, error: "Suscripción o aviso inválidos." }, { status: 400 });
  }

  try {
    const r = await enviarPush(pedido.data.suscripcion, pedido.data.aviso, {
      publica,
      privada,
      sujeto: process.env.VAPID_SUBJECT || "mailto:kairos@example.com",
    });
    if (r.ok) return NextResponse.json({ ok: true });
    return NextResponse.json({ ok: false, vencida: r.vencida, error: `El servicio de push respondió ${r.status}.` }, { status: 502 });
  } catch {
    return NextResponse.json({ ok: false, error: "No pudimos mandar el aviso." }, { status: 502 });
  }
}
