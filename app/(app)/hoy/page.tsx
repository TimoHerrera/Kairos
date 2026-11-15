"use client";

import { Check, Clock, Mic } from "lucide-react";
import Link from "next/link";
import { FilaCliente, direccionPropiedad } from "@/components/app/filas";
import { Cargando, Pantalla, SeccionTitulo, Vacio } from "@/components/app/pantalla";
import { Logo } from "@/components/brand/logo";
import { Avatar } from "@/components/ui/avatar";
import { AvisoOportunidad } from "@/components/ui/aviso-oportunidad";
import { Acento, Eyebrow, Titulo } from "@/components/ui/bloque";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { useAgent, useBuyers, useMatches } from "@/lib/data/hooks";
import { ambientesCorto } from "@/lib/domain/labels";
import { formatMonto, formatPorcentaje } from "@/lib/format";
import { DIAS_PARA_REACTIVAR, diasDesde, fechaLarga, haceCuanto, saludo } from "@/lib/format/tiempo";

const primerNombre = (nombre: string) => nombre.split(" ")[0];

export default function Hoy() {
  const agente = useAgent();
  const oportunidades = useMatches(["new", "seen", "sent"]);
  const clientes = useBuyers();

  const lista = oportunidades.data ?? [];
  const nueva = lista.find((m) => m.status === "new");
  const paraReactivar = (clientes.data ?? []).filter(
    (c) => c.status === "active" && c.last_contact_at && diasDesde(c.last_contact_at) > DIAS_PARA_REACTIVAR,
  );
  const cargando = oportunidades.isPending || clientes.isPending;
  const n = lista.length;

  return (
    <Pantalla
      accion={
        <ButtonLink href="/nota" ancho="completo" icono={<Mic size={20} strokeWidth={1.75} aria-hidden="true" />}>
          Grabar audio
        </ButtonLink>
      }
    >
      <header className="flex items-center justify-between">
        <Logo ancho={96} />
        <Link href="/perfil" aria-label="Tu perfil" className="rounded-full p-0.5">
          <Avatar nombre={agente.data?.name ?? ""} />
        </Link>
      </header>

      <div className="mt-5">
        <Eyebrow>Tu cartera · hoy</Eyebrow>
        <Titulo as="h1" className="mt-1">
          {cargando ? (
            <>
              Tu <Acento>cartera</Acento>
            </>
          ) : n === 0 ? (
            <>
              Tu cartera está al <Acento>día</Acento>
            </>
          ) : n === 1 ? (
            <>
              1 oportunidad <Acento>nueva</Acento>
            </>
          ) : (
            <>
              {n} oportunidades <Acento>nuevas</Acento>
            </>
          )}
        </Titulo>
        <p className="mt-1 text-cuerpo-s text-texto-suave">
          {/* La hora se lee recién en el navegador, con los datos ya cargados. */}
          {agente.data ? `${saludo()}, ${primerNombre(agente.data.name)} · ${fechaLarga()}` : " "}
        </p>
      </div>

      {cargando ? (
        <div className="mt-5">
          <Cargando />
        </div>
      ) : (
        <>
          {nueva ? (
            <AvisoOportunidad
              className="mt-5"
              cuando={haceCuanto(nueva.created_at)}
              titulo={`Esta propiedad le sirve a ${primerNombre(nueva.buyer.name)}`}
              resumen={`${ambientesCorto(nueva.property.property_type, nueva.property.rooms)} en ${direccionPropiedad(
                nueva.property,
              )} · ${formatMonto(nueva.property.price, nueva.property.currency)} · ${formatPorcentaje(
                nueva.score,
              )} de encaje`}
              etiqueta={<Chip variante="oportunidad">Nueva oportunidad</Chip>}
            />
          ) : null}

          <SeccionTitulo>Clientes que encajan</SeccionTitulo>
          {n === 0 ? (
            <Vacio titulo="Todavía no hay oportunidades">Contale a Kairos de tu primer cliente.</Vacio>
          ) : (
            <ul className="space-y-3">
              {lista.map((m) => (
                <li key={m.id}>
                  <Card>
                    <FilaCliente
                      nombre={m.buyer.name}
                      detalle={direccionPropiedad(m.property)}
                      abajo={
                        <>
                          <Chip>{formatPorcentaje(m.score)} encaje</Chip>
                          {m.status === "sent" ? (
                            <Chip variante="exito" icono={<Check size={14} strokeWidth={2.25} aria-hidden="true" />}>
                              Enviado
                            </Chip>
                          ) : null}
                        </>
                      }
                    />
                  </Card>
                </li>
              ))}
            </ul>
          )}

          {paraReactivar.length > 0 ? (
            <>
              <SeccionTitulo>
                <span className="inline-flex items-center gap-2">
                  <Clock size={20} strokeWidth={1.75} aria-hidden="true" className="text-alerta" />
                  Para reactivar
                </span>
              </SeccionTitulo>
              <Card className="divide-y divide-linea py-0">
                {paraReactivar.map((c) => (
                  <FilaCliente
                    key={c.id}
                    className="py-3.5"
                    nombre={c.name}
                    detalle={`${haceCuanto(c.last_contact_at!).replace("hace", "Hace")} sin hablar${
                      c.summary ? ` · ${c.summary[0].toLowerCase()}${c.summary.slice(1)}` : ""
                    }`}
                    derecha={
                      c.phone ? (
                        <ButtonLink
                          href={`https://wa.me/${c.phone}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          variante="secundario"
                          tamano="sm"
                          aria-label={`Escribirle a ${c.name} por WhatsApp`}
                        >
                          Escribirle
                        </ButtonLink>
                      ) : null
                    }
                  />
                ))}
              </Card>
            </>
          ) : null}
        </>
      )}
    </Pantalla>
  );
}
