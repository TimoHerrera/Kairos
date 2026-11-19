"use client";

import { Image as ImageIcon, Minimize2, MessageCircle, Briefcase } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { FotoPropiedad, direccionPropiedad } from "@/components/app/filas";
import { Button } from "@/components/ui/button";
import { ChipBoton } from "@/components/ui/chip";
import { Hoja } from "@/components/ui/hoja";
import type { PedidoMensaje, RespuestaMensaje, Tono } from "@/lib/ai/message/schema";
import { redactarConPlantilla } from "@/lib/ai/message/plantilla";
import { getDataSource, type MatchWithRefs } from "@/lib/data";
import { ambientesCorto } from "@/lib/domain/labels";
import { formatMonto } from "@/lib/format";
import { linkWhatsApp } from "@/lib/format/telefono";
import { tieneCaracteristica } from "@/lib/match/motor";

const primerNombre = (n: string) => n.split(" ")[0];

/** Lo que se le manda a la IA: nombre de pila, la propiedad y lo que evita. Nada más. */
export function pedidoDeMensaje(m: MatchWithRefs, deal_breakers: string[], tono: Tono, fotos: boolean): PedidoMensaje {
  const p = m.property;
  const zona = p.subzone ? (p.subzone.startsWith(p.neighborhood) ? p.subzone : `${p.neighborhood} ${p.subzone}`) : p.neighborhood;
  return {
    tono,
    fotos,
    nombre: primerNombre(m.buyer.name),
    propiedad: {
      tipo: p.property_type,
      ambientes: p.rooms,
      direccion: p.address,
      zona,
      piso: p.floor,
      balcon: p.balcony,
      luminoso: tieneCaracteristica(p, "luminoso") === "si",
      orientacion: p.orientation,
      precio: formatMonto(p.price, p.currency),
      url: p.url,
    },
    evita: deal_breakers.filter((c) => tieneCaracteristica(p, c) === "no"),
  };
}

/**
 * Hoja del mensaje (pantalla 07): el texto armado con lo que se sabe del cliente, editable,
 * con chips para ajustarlo y "Enviar por WhatsApp".
 */
export function HojaMensaje({
  abierta,
  oportunidad: m,
  dealBreakers,
  onCerrar,
  onEnviado,
}: {
  abierta: boolean;
  oportunidad: MatchWithRefs;
  dealBreakers: string[];
  onCerrar: () => void;
  onEnviado: () => void;
}) {
  const [tono, setTono] = useState<Tono>("normal");
  const [fotos, setFotos] = useState(false);
  const [texto, setTexto] = useState("");
  const [cargando, setCargando] = useState(false);
  const pedidoActual = useRef(0);
  const nombre = primerNombre(m.buyer.name);

  const redactar = useCallback(
    async (t: Tono, f: boolean) => {
      const pedido = pedidoDeMensaje(m, dealBreakers, t, f);
      const numero = ++pedidoActual.current;
      setCargando(true);
      try {
        const r = await fetch("/api/ai/message", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(pedido) });
        const json = (await r.json()) as RespuestaMensaje;
        if (numero === pedidoActual.current) setTexto(json.ok ? json.texto : redactarConPlantilla(pedido));
      } catch {
        // Sin conexión, la plantilla local alcanza.
        if (numero === pedidoActual.current) setTexto(redactarConPlantilla(pedido));
      } finally {
        if (numero === pedidoActual.current) setCargando(false);
      }
    },
    [m, dealBreakers],
  );

  useEffect(() => {
    // Se redacta al abrir la hoja: es pedir datos afuera, no derivar estado.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (abierta) void redactar(tono, fotos);
    // Solo al abrir: los cambios de tono los maneja cada chip.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierta]);

  function cambiar(t: Tono, f: boolean) {
    setTono(t);
    setFotos(f);
    void redactar(t, f);
  }

  async function enviar() {
    if (!m.buyer.phone || !texto.trim()) return;
    window.open(linkWhatsApp(m.buyer.phone, texto.trim()), "_blank", "noopener,noreferrer");
    const ds = getDataSource();
    await ds.messages.create({ match_id: m.id, text: texto, tone: tono });
    await ds.matches.setStatus(m.id, "sent");
    await ds.buyers.update(m.buyer.id, { last_contact_at: new Date().toISOString() });
    onEnviado();
  }

  const p = m.property;

  return (
    <Hoja abierta={abierta} onCerrar={onCerrar} titulo={`Mensaje para ${nombre}`} descripcion={`Lo armamos con lo que sabés de ${nombre}. Editalo si querés.`}>
      <div className="flex items-center gap-3 rounded-md border border-linea p-2">
        <FotoPropiedad propiedad={p} className="size-12 rounded-sm" sizes="48px" />
        <div className="min-w-0">
          <p className="truncate text-[14px] leading-5 font-semibold text-tinta">{direccionPropiedad(p)}</p>
          <p className="text-pie text-texto-suave">
            {ambientesCorto(p.property_type, p.rooms)} · {formatMonto(p.price, p.currency)}
          </p>
        </div>
      </div>

      <label htmlFor="mensaje" className="mt-4 mb-1 block text-[14px] leading-5 font-semibold text-tinta">
        Mensaje para {nombre}
      </label>
      <textarea
        id="mensaje"
        rows={8}
        value={cargando && !texto ? "Redactando…" : texto}
        onChange={(e) => setTexto(e.target.value)}
        aria-busy={cargando}
        className="block w-full resize-y rounded-md border border-linea-control bg-superficie px-4 py-3 text-cuerpo text-tinta"
      />

      <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Ajustar el mensaje">
        <ChipBoton activo={tono === "shorter"} icono={<Minimize2 size={16} strokeWidth={1.75} aria-hidden="true" />} onClick={() => cambiar(tono === "shorter" ? "normal" : "shorter", fotos)}>
          Más corto
        </ChipBoton>
        <ChipBoton activo={tono === "formal"} icono={<Briefcase size={16} strokeWidth={1.75} aria-hidden="true" />} onClick={() => cambiar(tono === "formal" ? "normal" : "formal", fotos)}>
          Más formal
        </ChipBoton>
        {p.url ? (
          <ChipBoton activo={fotos} icono={<ImageIcon size={16} strokeWidth={1.75} aria-hidden="true" />} onClick={() => cambiar(tono, !fotos)}>
            Agregar fotos
          </ChipBoton>
        ) : null}
      </div>
      {!p.url ? <p className="mt-2 text-pie text-texto-suave">Para mandar las fotos, cargá el link del aviso en la propiedad.</p> : null}

      <Button
        ancho="completo"
        className="mt-5"
        icono={<MessageCircle size={20} strokeWidth={1.75} aria-hidden="true" />}
        onClick={enviar}
        disabled={cargando || !texto.trim() || !m.buyer.phone}
      >
        Enviar por WhatsApp
      </Button>
      <p className="mt-2 text-center text-pie text-texto-suave">Se abre WhatsApp con el mensaje listo; lo mandás vos.</p>
    </Hoja>
  );
}
