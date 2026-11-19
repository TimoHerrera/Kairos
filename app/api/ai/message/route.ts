import { NextResponse } from "next/server";
import { redactarMensaje } from "@/lib/ai/message";
import { PedidoMensaje, type RespuestaMensaje } from "@/lib/ai/message/schema";

/** POST /api/ai/message — redacta el mensaje de WhatsApp para ofrecerle la propiedad al cliente. */
export async function POST(request: Request) {
  let cuerpo: unknown;
  try {
    cuerpo = await request.json();
  } catch {
    return NextResponse.json<RespuestaMensaje>({ ok: false, error: "El pedido no es JSON." }, { status: 400 });
  }
  const pedido = PedidoMensaje.safeParse(cuerpo);
  if (!pedido.success) {
    return NextResponse.json<RespuestaMensaje>({ ok: false, error: "Faltan datos para armar el mensaje." }, { status: 400 });
  }
  const r = await redactarMensaje(pedido.data);
  return NextResponse.json(r, { status: r.ok ? 200 : 502 });
}
