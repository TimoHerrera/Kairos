"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Check, Download, LogOut, RotateCcw, Sparkles, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { AjustesAvisos } from "@/components/app/ajustes-avisos";
import { Pantalla, SeccionTitulo } from "@/components/app/pantalla";
import { Avatar } from "@/components/ui/avatar";
import { Eyebrow, Titulo } from "@/components/ui/bloque";
import { Button } from "@/components/ui/button";
import { Campo } from "@/components/ui/campo";
import { Card } from "@/components/ui/card";
import { Casilla } from "@/components/ui/casilla";
import { Chip } from "@/components/ui/chip";
import { Hoja, HojaAcciones } from "@/components/ui/hoja";
import { ThemeSwitch } from "@/components/ui/theme-switch";
import { Toast } from "@/components/ui/toast";
import { getDataSource } from "@/lib/data";
import { useAgent, useUpdateSettings } from "@/lib/data/hooks";
import { formatTelefono } from "@/lib/format/telefono";
import { recalcularYAvisar } from "@/lib/push/avisar";

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
  const actualizar = useUpdateSettings();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [confirmando, setConfirmando] = useState(false);
  const [restablecido, setRestablecido] = useState(false);
  const [simulando, setSimulando] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const cerrarToast = useCallback(() => setToast(null), []);
  const [borrando, setBorrando] = useState(false);

  const a = agente.data;

  async function restablecer() {
    await getDataSource().demo.reset();
    await queryClient.invalidateQueries();
    setConfirmando(false);
    setRestablecido(true);
  }

  /** Hace entrar una propiedad de demo y dispara la alerta en vivo, como en la presentación. */
  async function simular() {
    setSimulando(true);
    const ds = getDataSource();
    const propiedad = await ds.demo.simulateProperty();
    if (!propiedad) {
      setToast("Ya entraron todas las propiedades de demo. Restablecé los datos para empezar de nuevo.");
      setSimulando(false);
      return;
    }
    const { nuevas } = await recalcularYAvisar(ds, { propiedadIds: [propiedad.id] });
    await queryClient.invalidateQueries();
    setSimulando(false);
    if (nuevas.length) router.push("/hoy");
    else setToast(`Entró ${propiedad.address}, pero no encaja con ningún cliente activo.`);
  }

  function exportar() {
    void getDataSource()
      .agent.exportAll()
      .then((datos) => {
        const blob = new Blob([JSON.stringify(datos, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `kairos-mis-datos-${new Date().toISOString().slice(0, 10)}.json`;
        link.click();
        URL.revokeObjectURL(url);
        setToast("Listo: se descargó un archivo con tus datos.");
      });
  }

  async function cerrarSesion() {
    // La caché se limpia sola cuando cambia la sesión (SessionProvider).
    await getDataSource().auth.signOut();
  }

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
          <Dato etiqueta="Teléfono" valor={a?.phone ? formatTelefono(a.phone) : null} />
        </dl>
      </Card>

      <SeccionTitulo>Avisos</SeccionTitulo>
      {a ? <AjustesAvisos settings={a.settings} /> : null}

      <SeccionTitulo>Tema</SeccionTitulo>
      <ThemeSwitch />

      <SeccionTitulo>Privacidad</SeccionTitulo>
      <Card className="space-y-3">
        {a ? (
          <Casilla
            checked={a.settings.delete_audio_after_transcribe}
            onChange={(v) => actualizar.mutate({ delete_audio_after_transcribe: v })}
            ayuda="El audio se procesa con un servicio de IA para pasarlo a texto. Si lo guardás, queda en tu cuenta y nadie más lo ve."
          >
            Borrar el audio después de transcribir
          </Casilla>
        ) : null}
        <p className="text-cuerpo-s text-texto">
          Tus clientes son datos personales: solo los ves vos. Leé cómo los cuidamos en la{" "}
          <Link href="/privacidad" className="font-semibold text-acento underline underline-offset-2">
            política de privacidad
          </Link>
          .
        </p>
        <div className="flex flex-col items-start gap-2">
          <Button variante="secundario" tamano="sm" icono={<Download size={20} strokeWidth={1.75} aria-hidden="true" />} onClick={exportar}>
            Exportar mis datos
          </Button>
          <Button variante="terciario" tamano="sm" className="-ml-4 text-error" icono={<Trash2 size={20} strokeWidth={1.75} aria-hidden="true" />} onClick={() => setBorrando(true)}>
            Borrar mi cuenta
          </Button>
        </div>
      </Card>

      {MODO_DEMO ? (
        <>
          <SeccionTitulo>Demo</SeccionTitulo>
          <Card className="space-y-3">
            <div>
              <p className="text-[15px] leading-5 font-semibold text-tinta">Simular propiedad nueva</p>
              <p className="mt-1 text-cuerpo-s text-texto">Hace entrar una propiedad de ejemplo que le sirve a un cliente y dispara el aviso en vivo.</p>
              <Button className="mt-3" tamano="sm" icono={<Sparkles size={20} strokeWidth={1.75} aria-hidden="true" />} onClick={simular} disabled={simulando}>
                {simulando ? "Entrando…" : "Simular propiedad nueva"}
              </Button>
            </div>
            <div className="border-t border-linea pt-3">
              <p className="text-cuerpo-s text-texto">Vuelve a cargar los clientes y propiedades de ejemplo. Lo que hayas cambiado en esta cuenta se pierde.</p>
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
            </div>
          </Card>
        </>
      ) : null}

      <div className="mt-8">
        <Button variante="secundario" ancho="completo" icono={<LogOut size={20} strokeWidth={1.75} aria-hidden="true" />} onClick={cerrarSesion}>
          Cerrar sesión
        </Button>
      </div>

      <Hoja abierta={borrando} onCerrar={() => setBorrando(false)} titulo="Borrar tu cuenta" descripcion="Se borran tus clientes, propiedades, notas y oportunidades. No se puede deshacer.">
        <BorrarCuenta onCancelar={() => setBorrando(false)} />
      </Hoja>
      <Toast texto={toast} onCerrar={cerrarToast} duracion={5000} />
    </Pantalla>
  );
}

function BorrarCuenta({ onCancelar }: { onCancelar: () => void }) {
  const [texto, setTexto] = useState("");
  const [borrando, setBorrando] = useState(false);
  const listo = texto.trim().toUpperCase() === "BORRAR";
  return (
    <form
      noValidate
      onSubmit={async (e) => {
        e.preventDefault();
        if (!listo) return;
        setBorrando(true);
        await getDataSource().agent.deleteAccount();
      }}
    >
      <p className="text-cuerpo-s text-texto">Si querés guardar algo, exportá tus datos antes. Para confirmar, escribí BORRAR.</p>
      <Campo className="mt-3" etiqueta="Confirmación" value={texto} onChange={(e) => setTexto(e.target.value)} autoCapitalize="characters" autoComplete="off" />
      <HojaAcciones>
        <Button type="submit" ancho="completo" disabled={!listo || borrando} className="bg-error text-white hover:bg-error active:bg-error">
          {borrando ? "Borrando…" : "Borrar mi cuenta para siempre"}
        </Button>
        <Button variante="terciario" ancho="completo" onClick={onCancelar}>
          Cancelar
        </Button>
      </HojaAcciones>
    </form>
  );
}
