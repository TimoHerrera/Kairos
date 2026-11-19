"use client";

import { ArrowLeft, BedDouble, Building2, Check, ExternalLink, Fence, Layers, Ruler, TriangleAlert, X } from "lucide-react";
import Link from "next/link";
import { use, type ReactNode } from "react";
import { FotoPropiedad, direccionPropiedad } from "@/components/app/filas";
import { Cargando, Pantalla, Vacio } from "@/components/app/pantalla";
import { Avatar } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { useProperty, usePropertyMatches } from "@/lib/data/hooks";
import { OPERACION, TIPO_PROPIEDAD, ambientesCorto, etiquetaCaracteristica, pisoTexto } from "@/lib/domain/labels";
import { NOMBRE_PORTAL } from "@/lib/domain/propiedad";
import { formatMonto, formatNumero, formatPorcentaje } from "@/lib/format";
import { diasDesde, haceCuanto } from "@/lib/format/tiempo";

const ORIGEN = { manual: "Cargada a mano", pasted: "Desde un aviso", imported: "Importada", demo: "Demo" } as const;

export function DetallePropiedad({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const propiedad = useProperty(id);
  const oportunidades = usePropertyMatches(id);

  if (propiedad.isPending) {
    return (
      <Pantalla>
        <Cargando filas={4} />
      </Pantalla>
    );
  }
  const p = propiedad.data;
  if (!p) {
    return (
      <Pantalla>
        <Volver />
        <div className="mt-8">
          <Vacio titulo="No encontramos esta propiedad">Puede que se haya borrado o que sea de otra cuenta.</Vacio>
        </div>
      </Pantalla>
    );
  }

  const nueva = diasDesde(p.published_at) < 2;
  const piso = pisoTexto(p.floor);

  return (
    <Pantalla>
      <header className="-mx-2 flex items-center gap-1">
        <Volver />
        <h1 className="sr-only">{direccionPropiedad(p)}</h1>
        <p className="flex-1 text-[17px] leading-[22px] font-semibold text-tinta">Propiedad</p>
      </header>

      <FotoPropiedad propiedad={p} className="mt-2 h-52 w-full rounded-lg" sizes="(max-width: 430px) 100vw, 430px" />

      <div className="mt-4 flex flex-wrap gap-2">
        {nueva ? <Chip variante="oportunidad">Nueva · {haceCuanto(p.published_at)}</Chip> : null}
        <Chip variante="descarte">{p.portal ? NOMBRE_PORTAL[p.portal] : ORIGEN[p.source]}</Chip>
        {p.operation === "rent" ? <Chip variante="descarte">{OPERACION.rent}</Chip> : null}
      </div>

      <p className="mt-3 text-titulo-s text-tinta">{direccionPropiedad(p)}</p>
      <p className="mt-1 text-titulo-m text-tinta">{formatMonto(p.price, p.currency)}</p>
      {p.expenses ? <p className="text-cuerpo-s text-texto-suave">Expensas {formatMonto(p.expenses, "ARS")}</p> : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <Spec icono={<Building2 size={16} strokeWidth={1.75} aria-hidden="true" />}>{ambientesCorto(p.property_type, p.rooms)}</Spec>
        {p.bedrooms ? <Spec icono={<BedDouble size={16} strokeWidth={1.75} aria-hidden="true" />}>{p.bedrooms} dorm.</Spec> : null}
        {p.covered_m2 ? (
          <Spec icono={<Ruler size={16} strokeWidth={1.75} aria-hidden="true" />}>
            {formatNumero(p.covered_m2)} m²{p.total_m2 && p.total_m2 !== p.covered_m2 ? ` (${formatNumero(p.total_m2)} tot.)` : ""}
          </Spec>
        ) : null}
        {piso ? <Spec icono={<Layers size={16} strokeWidth={1.75} aria-hidden="true" />}>{piso}</Spec> : null}
        {p.balcony ? <Spec icono={<Fence size={16} strokeWidth={1.75} aria-hidden="true" />}>Balcón</Spec> : null}
      </div>

      {/* Le sirve a */}
      <Card className="mt-5">
        <h2 className="text-[17px] leading-[22px] font-semibold text-tinta">Le sirve a</h2>
        {oportunidades.data?.length ? (
          <ul className="divide-y divide-linea">
            {oportunidades.data.map((m) => (
              <li key={m.id}>
                <Link href={`/oportunidad/${m.id}`} className="-mx-2 flex min-h-14 items-center gap-3 rounded-md px-2 py-2.5 hover:bg-superficie-tinte">
                  <Avatar nombre={m.buyer.name} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] leading-5 font-semibold text-tinta">{m.buyer.name}</span>
                    {m.buyer.summary ? <span className="block truncate text-pie text-texto-suave">{m.buyer.summary}</span> : null}
                    <span className="mt-1.5 flex flex-wrap gap-1.5">
                      <Chip>{formatPorcentaje(m.score)} encaje</Chip>
                      {m.status === "sent" ? (
                        <Chip variante="exito" icono={<Check size={14} strokeWidth={2.25} aria-hidden="true" />}>
                          Enviado
                        </Chip>
                      ) : null}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-cuerpo-s text-texto-suave">
            Todavía no la crucé con tus clientes. Cuando encaje con alguien, aparece acá.
          </p>
        )}
      </Card>

      {/* Detalles */}
      <Card className="mt-3">
        <h2 className="text-[17px] leading-[22px] font-semibold text-tinta">Detalles</h2>
        <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-3 text-cuerpo-s">
          <Dato etiqueta="Tipo">{TIPO_PROPIEDAD[p.property_type]}</Dato>
          <Dato etiqueta="Operación">{OPERACION[p.operation]}</Dato>
          {p.orientation ? <Dato etiqueta="Orientación">{p.orientation}</Dato> : null}
          <Dato etiqueta="Apto crédito">
            {p.credit_eligible === "yes" ? (
              <Estado tipo="si">Sí</Estado>
            ) : p.credit_eligible === "no" ? (
              <Estado tipo="no">No</Estado>
            ) : (
              <Estado tipo="duda">A confirmar</Estado>
            )}
          </Dato>
          <Dato etiqueta="Avenida">{p.on_avenue ? <Estado tipo="duda">Da a una avenida</Estado> : <Estado tipo="si">No da a avenida</Estado>}</Dato>
        </dl>
        {p.amenities.length ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {p.amenities.map((a) => (
              <Chip key={a}>{etiquetaCaracteristica(a)}</Chip>
            ))}
          </div>
        ) : null}
      </Card>

      {p.description ? (
        <Card className="mt-3">
          <h2 className="text-[17px] leading-[22px] font-semibold text-tinta">Descripción</h2>
          <p className="mt-1 text-cuerpo-s whitespace-pre-line text-texto">{p.description}</p>
        </Card>
      ) : null}

      {p.url ? (
        <a
          href={p.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex min-h-11 items-center gap-2 text-boton text-acento underline underline-offset-2"
        >
          <ExternalLink size={20} strokeWidth={1.75} aria-hidden="true" />
          Ver el aviso{p.portal && p.portal !== "other" ? ` en ${NOMBRE_PORTAL[p.portal]}` : ""}
        </a>
      ) : null}
      <p className="mt-4 text-pie text-texto-suave">
        {ORIGEN[p.source]} · publicada {haceCuanto(p.published_at)}
      </p>
    </Pantalla>
  );
}

function Volver() {
  return (
    <Link
      href="/propiedades"
      aria-label="Volver a propiedades"
      className="flex size-11 shrink-0 items-center justify-center rounded-full text-tinta hover:bg-superficie-tinte"
    >
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

function Dato({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-pie text-texto-suave">{etiqueta}</dt>
      <dd className="text-tinta">{children}</dd>
    </div>
  );
}

/** Estados siempre con ícono y palabra, nunca solo color. */
function Estado({ tipo, children }: { tipo: "si" | "no" | "duda"; children: ReactNode }) {
  const Icono = tipo === "si" ? Check : tipo === "no" ? X : TriangleAlert;
  const color = tipo === "si" ? "text-exito" : tipo === "no" ? "text-error" : "text-alerta";
  return (
    <span className="inline-flex items-center gap-1">
      <Icono size={16} strokeWidth={2} aria-hidden="true" className={color} />
      {children}
    </span>
  );
}
