import { NextResponse } from "next/server";
import { leerAviso } from "@/lib/ai/listing";
import { PedidoAviso, type RespuestaAviso } from "@/lib/ai/listing/schema";

/** POST /api/ai/listing — recibe el texto de un aviso pegado y devuelve los campos para revisar. */
export async function POST(request: Request) {
  let cuerpo: unknown;
  try {
    cuerpo = await request.json();
  } catch {
    return NextResponse.json<RespuestaAviso>({ ok: false, error: "El pedido no es JSON." }, { status: 400 });
  }
  const pedido = PedidoAviso.safeParse(cuerpo);
  if (!pedido.success) {
    return NextResponse.json<RespuestaAviso>(
      { ok: false, error: "Pegá el texto completo del aviso (y el link, si lo tenés, completo)." },
      { status: 400 },
    );
  }
  const respuesta = await leerAviso(pedido.data);
  return NextResponse.json(respuesta, { status: respuesta.ok ? 200 : 502 });
}
