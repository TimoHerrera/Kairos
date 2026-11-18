import { NextResponse } from "next/server";
import { extraerNota } from "@/lib/ai/extract";
import { PedidoExtraccion, type RespuestaExtraccion } from "@/lib/ai/extract/schema";

/** POST /api/ai/extract — recibe la transcripción (y la ficha actual, sin datos de contacto) y devuelve la nota extraída. */
export async function POST(request: Request) {
  let cuerpo: unknown;
  try {
    cuerpo = await request.json();
  } catch {
    return NextResponse.json<RespuestaExtraccion>({ ok: false, error: "El pedido no es JSON." }, { status: 400 });
  }

  const pedido = PedidoExtraccion.safeParse(cuerpo);
  if (!pedido.success) {
    return NextResponse.json<RespuestaExtraccion>(
      { ok: false, error: "La nota está vacía o es demasiado larga." },
      { status: 400 },
    );
  }

  const respuesta = await extraerNota(pedido.data);
  return NextResponse.json(respuesta, { status: respuesta.ok ? 200 : 502 });
}
