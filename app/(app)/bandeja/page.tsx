"use client";

import { ArrowLeft, Check } from "lucide-react";
import Link from "next/link";
import { Cargando, Pantalla, Vacio } from "@/components/app/pantalla";
import { direccionPropiedad } from "@/components/app/filas";
import { AvisoOportunidad } from "@/components/ui/aviso-oportunidad";
import { Eyebrow, Titulo } from "@/components/ui/bloque";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { getDataSource } from "@/lib/data";
import { useMatches } from "@/lib/data/hooks";
import { ambientesCorto } from "@/lib/domain/labels";
import { formatMonto } from "@/lib/format";
import { haceCuanto } from "@/lib/format/tiempo";
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "@/lib/session/provider";

const primerNombre = (n: string) => n.split(" ")[0];

/** La bandeja: todos los avisos de oportunidades, los más nuevos arriba. */
export default function Bandeja() {
  const avisos = useMatches();
  const sesion = useSession();
  const queryClient = useQueryClient();
  const lista = avisos.data ?? [];
  const sinVer = lista.filter((m) => m.status === "new");

  async function marcarVistas() {
    const ds = getDataSource();
    for (const m of sinVer) await ds.matches.setStatus(m.id, "seen");
    await queryClient.invalidateQueries({ queryKey: [sesion?.agentId] });
  }

  return (
    <Pantalla>
      <header className="-mx-2 flex items-center gap-1">
        <Link href="/hoy" aria-label="Volver a Hoy" className="flex size-11 shrink-0 items-center justify-center rounded-full text-tinta hover:bg-superficie-tinte">
          <ArrowLeft size={24} strokeWidth={1.75} aria-hidden="true" />
        </Link>
      </header>
      <div className="mt-2 flex items-end justify-between gap-3">
        <div>
          <Eyebrow>Avisos</Eyebrow>
          <Titulo as="h1" className="mt-1">
            Bandeja
          </Titulo>
        </div>
        {sinVer.length ? (
          <Button tamano="sm" variante="terciario" icono={<Check size={20} strokeWidth={1.75} aria-hidden="true" />} onClick={marcarVistas}>
            Marcar vistas
          </Button>
        ) : null}
      </div>

      <div className="mt-5">
        {avisos.isPending ? (
          <Cargando filas={3} />
        ) : lista.length === 0 ? (
          <Vacio titulo="No hay avisos todavía">Cuando entre una propiedad que le sirva a un cliente, te aviso acá.</Vacio>
        ) : (
          <ul className="space-y-3">
            {lista.map((m) => (
              <li key={m.id}>
                <Link href={`/oportunidad/${m.id}`} className="block rounded-lg" aria-label={`Abrir la oportunidad de ${m.buyer.name} en ${m.property.address}`}>
                  <AvisoOportunidad
                    animar={false}
                    cuando={haceCuanto(m.notified_at ?? m.created_at)}
                    titulo={`Esta propiedad le sirve a ${primerNombre(m.buyer.name)}`}
                    resumen={`${ambientesCorto(m.property.property_type, m.property.rooms)} en ${direccionPropiedad(m.property)} · ${formatMonto(m.property.price, m.property.currency)} · ${m.score}% de encaje`}
                    etiqueta={
                      m.status === "new" ? (
                        <Chip variante="oportunidad">Nueva oportunidad</Chip>
                      ) : m.status === "sent" ? (
                        <Chip variante="exito" icono={<Check size={14} strokeWidth={2.25} aria-hidden="true" />}>
                          Enviado
                        </Chip>
                      ) : m.status === "dismissed" ? (
                        <Chip variante="descarte">Ahora no</Chip>
                      ) : (
                        <Chip variante="descarte">Vista</Chip>
                      )
                    }
                    className={m.status === "new" ? "" : "shadow-none"}
                  />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Pantalla>
  );
}
