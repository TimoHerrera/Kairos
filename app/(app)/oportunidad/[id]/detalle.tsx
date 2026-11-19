"use client";

import { ArrowLeft, Building2, Check, Fence, Info, Layers, MessageCircle, Ruler, TriangleAlert, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { AnilloEncaje } from "@/components/app/anillo-encaje";
import { HojaMensaje } from "@/components/app/hoja-mensaje";
import { Toast } from "@/components/ui/toast";
import { FotoPropiedad, direccionPropiedad } from "@/components/app/filas";
import { Cargando, Pantalla, Vacio } from "@/components/app/pantalla";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { useBuyerCriteria, useMatch, useSetMatchStatus } from "@/lib/data/hooks";
import { ambientesCorto, pisoTexto } from "@/lib/domain/labels";
import { NOMBRE_PORTAL } from "@/lib/domain/propiedad";
import { formatMonto, formatNumero } from "@/lib/format";
import { haceCuanto } from "@/lib/format/tiempo";
import { calificacion } from "@/lib/match/motor";
import { cumpleDeLas } from "@/lib/match/recalcular";

const primerNombre = (n: string) => n.split(" ")[0];

export function DetalleOportunidad({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const oportunidad = useMatch(id);
  const cambiarEstado = useSetMatchStatus();
  const [escribiendo, setEscribiendo] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const cerrarToast = useCallback(() => setToast(null), []);

  // Abrirla la marca como vista, una sola vez.
  const marcada = useRef(false);
  const m = oportunidad.data;
  const ficha = useBuyerCriteria(m?.buyer_id ?? "");
  useEffect(() => {
    if (m && m.status === "new" && !marcada.current) {
      marcada.current = true;
      cambiarEstado.mutate({ id: m.id, status: "seen" });
    }
  }, [m, cambiarEstado]);

  if (oportunidad.isPending) {
    return (
      <Pantalla>
        <Cargando filas={4} />
      </Pantalla>
    );
  }
  if (!m) {
    return (
      <Pantalla>
        <Volver />
        <div className="mt-8">
          <Vacio titulo="Esta oportunidad ya no está">Puede que la ficha del cliente haya cambiado y la propiedad ya no le sirva.</Vacio>
        </div>
      </Pantalla>
    );
  }

  const p = m.property;
  const nombre = primerNombre(m.buyer.name);
  const { cumple, total } = cumpleDeLas(m.reasons);
  const piso = pisoTexto(p.floor);
  const enviada = m.status === "sent";

  function mandar() {
    setEscribiendo(true);
  }

  return (
    <Pantalla
      accion={
        <div className="space-y-2">
          {enviada ? (
            <p className="flex items-center justify-center gap-1.5 text-cuerpo-s font-semibold text-exito" role="status">
              <Check size={18} strokeWidth={2} aria-hidden="true" />
              Enviado a {nombre} {m.sent_at ? haceCuanto(m.sent_at) : ""}
            </p>
          ) : null}
          {m.buyer.phone ? (
            <Button ancho="completo" icono={<MessageCircle size={20} strokeWidth={1.75} aria-hidden="true" />} onClick={mandar}>
              {enviada ? `Mandársela de nuevo a ${nombre}` : `Mandársela a ${nombre}`}
            </Button>
          ) : (
            <Link
              href={`/clientes/${m.buyer.id}`}
              className="flex min-h-12 items-center justify-center rounded-md border border-linea-control text-boton text-tinta"
            >
              Cargá el WhatsApp de {nombre} para mandársela
            </Link>
          )}
          {!enviada && m.status !== "dismissed" ? (
            <Button
              variante="terciario"
              ancho="completo"
              onClick={() => {
                cambiarEstado.mutate({ id: m.id, status: "dismissed" });
                router.push("/hoy");
              }}
            >
              Ahora no
            </Button>
          ) : null}
        </div>
      }
    >
      <header className="-mx-2 flex items-center gap-1">
        <Volver />
        <h1 className="flex-1 text-[17px] leading-[22px] font-semibold text-tinta">
          {m.status === "new" || m.status === "seen" ? "Oportunidad nueva" : "Oportunidad"}
        </h1>
      </header>

      <Link href={`/propiedades/${p.id}`} aria-label={`Ver la propiedad ${direccionPropiedad(p)}`}>
        <FotoPropiedad propiedad={p} className="mt-2 h-48 w-full rounded-lg" sizes="(max-width: 430px) 100vw, 430px" />
      </Link>

      <div className="mt-3 flex flex-wrap gap-2">
        {m.status === "new" || m.status === "seen" ? <Chip variante="oportunidad">Nueva · {haceCuanto(m.created_at)}</Chip> : null}
        {p.portal ? <Chip variante="descarte">{NOMBRE_PORTAL[p.portal]}</Chip> : null}
      </div>
      <p className="mt-2 text-titulo-s text-tinta">{direccionPropiedad(p)}</p>
      <p className="mt-1 text-titulo-m text-tinta">{formatMonto(p.price, p.currency)}</p>
      {p.expenses ? <p className="text-cuerpo-s text-texto-suave">Expensas {formatMonto(p.expenses, "ARS")}</p> : null}

      <div className="mt-3 flex flex-wrap gap-2">
        <Spec icono={<Building2 size={16} strokeWidth={1.75} aria-hidden="true" />}>{ambientesCorto(p.property_type, p.rooms)}</Spec>
        {p.covered_m2 ? <Spec icono={<Ruler size={16} strokeWidth={1.75} aria-hidden="true" />}>{formatNumero(p.covered_m2)} m²</Spec> : null}
        {piso ? <Spec icono={<Layers size={16} strokeWidth={1.75} aria-hidden="true" />}>{piso}</Spec> : null}
        {p.balcony ? <Spec icono={<Fence size={16} strokeWidth={1.75} aria-hidden="true" />}>Balcón</Spec> : null}
      </div>

      {/* La tarjeta destacada de la vista: el encaje. */}
      <Card destacada className="mt-5 flex items-center gap-4">
        <AnilloEncaje score={m.score} />
        <div className="min-w-0">
          <Link href={`/clientes/${m.buyer.id}`} className="text-eyebrow text-lavanda underline-offset-2 hover:underline">
            Para {nombre}
          </Link>
          <p className="mt-1 text-titulo-s text-sobre-destacado">{calificacion(m.score)}</p>
          <p className="mt-0.5 text-cuerpo-s text-texto-destacado">
            Cumple {cumple} de las {total} {total === 1 ? "cosa" : "cosas"} que busca.
          </p>
        </div>
      </Card>

      <Card className="mt-3">
        <h2 className="text-[17px] leading-[22px] font-semibold text-tinta">Por qué le sirve</h2>
        <ul className="mt-1 divide-y divide-linea">
          {m.reasons.met.map((r) => (
            <Razon key={r} tipo="si">
              {r}
            </Razon>
          ))}
          {m.reasons.unconfirmed.map((r) => (
            <Razon key={r} tipo="duda">
              {r}
            </Razon>
          ))}
          {m.reasons.unmet.map((r) => (
            <Razon key={r} tipo="no">
              {r}
            </Razon>
          ))}
        </ul>
      </Card>

      {m.reasons.discard_note ? (
        <p className="mt-3 flex items-start gap-2 rounded-md bg-chip px-3 py-2.5 text-cuerpo-s text-tinta">
          <Info size={18} strokeWidth={1.75} aria-hidden="true" className="mt-px shrink-0 text-sobre-chip" />
          {m.reasons.discard_note}
        </p>
      ) : null}

      <HojaMensaje
        abierta={escribiendo}
        oportunidad={m}
        dealBreakers={ficha.data?.deal_breakers ?? []}
        onCerrar={() => setEscribiendo(false)}
        onEnviado={() => {
          setEscribiendo(false);
          setToast(`Enviado a ${nombre}`);
          void oportunidad.refetch();
        }}
      />
      <Toast texto={toast} onCerrar={cerrarToast} />
    </Pantalla>
  );
}

function Volver() {
  return (
    <Link href="/hoy" aria-label="Volver a Hoy" className="flex size-11 shrink-0 items-center justify-center rounded-full text-tinta hover:bg-superficie-tinte">
      <ArrowLeft size={24} strokeWidth={1.75} aria-hidden="true" />
    </Link>
  );
}

function Spec({ icono, children }: { icono: ReactNode; children: ReactNode }) {
  return (
    <span className="inline-flex h-8 items-center gap-1.5 rounded-full border border-linea bg-superficie px-3 text-[13px] leading-4 font-semibold text-tinta">
      <span className="text-acento">{icono}</span>
      {children}
    </span>
  );
}

/** ✓ cumple, ⚠ falta confirmar, ✕ no cumple: siempre ícono y palabra, nunca solo color. */
function Razon({ tipo, children }: { tipo: "si" | "duda" | "no"; children: ReactNode }) {
  const Icono = tipo === "si" ? Check : tipo === "duda" ? TriangleAlert : X;
  const color = tipo === "si" ? "text-exito" : tipo === "duda" ? "text-alerta" : "text-error";
  const etiqueta = tipo === "si" ? "Cumple" : tipo === "duda" ? "A confirmar" : "No cumple";
  return (
    <li className="flex items-start gap-2.5 py-2.5 text-cuerpo-s text-tinta">
      <Icono size={18} strokeWidth={2} aria-label={etiqueta} className={`mt-px shrink-0 ${color}`} />
      <span>{children}</span>
    </li>
  );
}
