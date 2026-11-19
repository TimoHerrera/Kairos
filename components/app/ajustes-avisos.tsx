"use client";

import { Bell, BellOff, Check, CircleAlert } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Casilla } from "@/components/ui/casilla";
import { Selector } from "@/components/ui/selector";
import { getDataSource, type AgentSettings } from "@/lib/data";
import { useUpdateSettings } from "@/lib/data/hooks";
import { activarAvisos, desactivarAvisos, estadoAvisos, type EstadoAvisos } from "@/lib/push/avisar";

const nada = () => () => {};
const UMBRALES = ["60", "70", "75", "80", "90"].map((v) => ({ valor: v, texto: `${v}% o más` }));

/** Perfil → Avisos: este dispositivo, el umbral y el horario de no molestar. */
export function AjustesAvisos({ settings }: { settings: AgentSettings }) {
  const actualizar = useUpdateSettings();
  // El estado del permiso cambia afuera de React: se vuelve a leer al tocar los botones.
  const [version, setVersion] = useState(0);
  const estado = useSyncExternalStore<EstadoAvisos>(nada, () => (version >= 0 ? estadoAvisos() : "desactivado"), () => "desactivado");
  const [mensaje, setMensaje] = useState<{ ok: boolean; texto: string } | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const noMolestar = Boolean(settings.dnd_start && settings.dnd_end);

  async function activar() {
    setOcupado(true);
    const r = await activarAvisos(getDataSource());
    setMensaje({ ok: r.ok, texto: r.mensaje });
    setVersion((v) => v + 1);
    setOcupado(false);
  }

  async function desactivar() {
    setOcupado(true);
    await desactivarAvisos(getDataSource());
    setMensaje({ ok: true, texto: "Listo. Para dejar de recibirlos del todo, quitá el permiso en los ajustes del navegador." });
    setVersion((v) => v + 1);
    setOcupado(false);
  }

  return (
    <Card className="space-y-4">
      <div>
        <p className="flex items-center gap-2 text-[15px] leading-5 font-semibold text-tinta">
          {estado === "activado" ? (
            <Bell size={20} strokeWidth={1.75} aria-hidden="true" className="text-acento" />
          ) : (
            <BellOff size={20} strokeWidth={1.75} aria-hidden="true" className="text-texto-suave" />
          )}
          {estado === "activado" ? "Avisos activados en este dispositivo" : "Avisos desactivados en este dispositivo"}
        </p>
        <p className="mt-1 text-cuerpo-s text-texto">
          {estado === "instalar-en-iphone"
            ? "En iPhone los avisos solo llegan con Kairos instalado: tocá Compartir → Agregar a inicio y abrilo desde ahí."
            : estado === "denegado"
              ? "El navegador tiene los avisos bloqueados para Kairos. Activalos desde sus ajustes."
              : estado === "no-soportado"
                ? "Este navegador no muestra avisos. Las oportunidades igual aparecen en Hoy."
                : "Te aviso cuando entra una propiedad que le sirve a un cliente. Nada más."}
        </p>
        {estado === "desactivado" ? (
          <Button className="mt-3" tamano="sm" onClick={activar} disabled={ocupado}>
            {ocupado ? "Activando…" : "Activar avisos"}
          </Button>
        ) : estado === "activado" ? (
          <Button className="mt-3" tamano="sm" variante="secundario" onClick={desactivar} disabled={ocupado}>
            Dejar de recibir push en este dispositivo
          </Button>
        ) : null}
        {mensaje ? (
          <p role="status" className={`mt-2 flex items-start gap-1.5 text-cuerpo-s ${mensaje.ok ? "text-exito" : "text-error"}`}>
            {mensaje.ok ? (
              <Check size={18} strokeWidth={2} aria-hidden="true" className="mt-px shrink-0" />
            ) : (
              <CircleAlert size={18} strokeWidth={1.75} aria-hidden="true" className="mt-px shrink-0" />
            )}
            {mensaje.texto}
          </p>
        ) : null}
      </div>

      <Selector
        etiqueta="Avisarme cuando el encaje sea de"
        value={String(settings.alert_threshold)}
        onChange={(e) => actualizar.mutate({ alert_threshold: Number(e.target.value) })}
        opciones={UMBRALES.some((u) => u.valor === String(settings.alert_threshold)) ? UMBRALES : [...UMBRALES, { valor: String(settings.alert_threshold), texto: `${settings.alert_threshold}% o más` }]}
      />

      <div>
        <Casilla
          checked={noMolestar}
          onChange={(v) => actualizar.mutate(v ? { dnd_start: "22:00", dnd_end: "08:00" } : { dnd_start: null, dnd_end: null })}
          ayuda="Las oportunidades igual quedan en Hoy y en la bandeja."
        >
          No molestar de noche
        </Casilla>
        {noMolestar ? (
          <div className="mt-2 grid grid-cols-2 gap-3">
            <HoraNoMolestar etiqueta="Desde" valor={settings.dnd_start!} onCambio={(v) => actualizar.mutate({ dnd_start: v })} />
            <HoraNoMolestar etiqueta="Hasta" valor={settings.dnd_end!} onCambio={(v) => actualizar.mutate({ dnd_end: v })} />
          </div>
        ) : null}
      </div>
    </Card>
  );
}

function HoraNoMolestar({ etiqueta, valor, onCambio }: { etiqueta: string; valor: string; onCambio: (v: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[14px] leading-5 font-semibold text-tinta">{etiqueta}</span>
      <input
        type="time"
        value={valor}
        onChange={(e) => e.target.value && onCambio(e.target.value)}
        className="block min-h-12 w-full rounded-md border border-linea-control bg-superficie px-4 text-cuerpo text-tinta"
      />
    </label>
  );
}
