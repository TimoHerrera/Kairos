"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Check, LogOut, RotateCcw } from "lucide-react";
import { useState } from "react";
import { Pantalla, SeccionTitulo } from "@/components/app/pantalla";
import { Avatar } from "@/components/ui/avatar";
import { Eyebrow, Titulo } from "@/components/ui/bloque";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { ThemeSwitch } from "@/components/ui/theme-switch";
import { AjustesAvisos } from "@/components/app/ajustes-avisos";
import { getDataSource } from "@/lib/data";
import { useAgent } from "@/lib/data/hooks";

const MODO_DEMO = process.env.NEXT_PUBLIC_DEMO_MODE !== "false";

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string | null | undefined }) {
  return (
    <div className="py-3">
      <dt className="text-pie text-texto-suave">{etiqueta}</dt>
      <dd className="text-cuerpo text-tinta">{valor || "Sin cargar"}</dd>
    </div>
  );
}

export default function Perfil() {
  const agente = useAgent();
  const queryClient = useQueryClient();
  const [confirmando, setConfirmando] = useState(false);
  const [restablecido, setRestablecido] = useState(false);

  async function restablecer() {
    await getDataSource().demo.reset();
    await queryClient.invalidateQueries();
    setConfirmando(false);
    setRestablecido(true);
  }

  async function cerrarSesion() {
    // La caché se limpia sola cuando cambia la sesión (SessionProvider).
    await getDataSource().auth.signOut();
  }

  const a = agente.data;

  return (
    <Pantalla>
      <Eyebrow>Perfil</Eyebrow>
      <div className="mt-2 flex items-center gap-3">
        <Avatar nombre={a?.name ?? ""} tamano="lg" />
        <div className="min-w-0">
          <Titulo as="h1" tamano="s" className="truncate">
            {a?.name ?? " "}
          </Titulo>
          <p className="truncate text-cuerpo-s text-texto-suave">{a?.email}</p>
        </div>
      </div>

      <SeccionTitulo>Tus datos</SeccionTitulo>
      <Card className="py-1">
        <dl className="divide-y divide-linea">
          <Dato etiqueta="Oficina" valor={a?.office} />
          <Dato etiqueta="Zona de trabajo" valor={a?.work_zone} />
          <Dato etiqueta="Teléfono" valor={a?.phone ? `+${a.phone}` : null} />
        </dl>
      </Card>

      <SeccionTitulo>Avisos</SeccionTitulo>
      {a ? <AjustesAvisos settings={a.settings} /> : null}

      <SeccionTitulo>Tema</SeccionTitulo>
      <ThemeSwitch />

      {MODO_DEMO ? (
        <>
          <SeccionTitulo>Demo</SeccionTitulo>
          <Card>
            <p className="text-cuerpo-s text-texto">
              Vuelve a cargar los clientes y propiedades de ejemplo. Lo que hayas cambiado en esta cuenta se pierde.
            </p>
            {confirmando ? (
              <div className="mt-3 flex flex-wrap gap-2">
                <Button tamano="sm" onClick={restablecer}>
                  Sí, restablecer
                </Button>
                <Button tamano="sm" variante="terciario" onClick={() => setConfirmando(false)}>
                  Cancelar
                </Button>
              </div>
            ) : (
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <Button
                  tamano="sm"
                  variante="secundario"
                  icono={<RotateCcw size={20} strokeWidth={1.75} aria-hidden="true" />}
                  onClick={() => {
                    setRestablecido(false);
                    setConfirmando(true);
                  }}
                >
                  Restablecer datos de demo
                </Button>
                {restablecido ? (
                  <span role="status">
                    <Chip variante="exito" icono={<Check size={14} strokeWidth={2.25} aria-hidden="true" />}>
                      Datos restablecidos
                    </Chip>
                  </span>
                ) : null}
              </div>
            )}
          </Card>
        </>
      ) : null}

      <div className="mt-8">
        <Button
          variante="secundario"
          ancho="completo"
          icono={<LogOut size={20} strokeWidth={1.75} aria-hidden="true" />}
          onClick={cerrarSesion}
        >
          Cerrar sesión
        </Button>
      </div>
    </Pantalla>
  );
}
