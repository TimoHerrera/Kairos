"use client";

import { Bell, Check, CircleAlert, Download, Lock, Mic, Share, Smartphone } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Pantalla } from "@/components/app/pantalla";
import { Logo } from "@/components/brand/logo";
import { Acento, Bajada, Eyebrow, Titulo } from "@/components/ui/bloque";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Casilla } from "@/components/ui/casilla";
import { getDataSource } from "@/lib/data";
import { useUpdateSettings } from "@/lib/data/hooks";
import { activarAvisos } from "@/lib/push/avisar";

type Resultado = { ok: boolean; texto: string } | null;

/** Evento de instalación de Chrome (no está en los tipos del DOM). */
type EventoInstalar = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

export function Bienvenida() {
  const router = useRouter();
  const actualizar = useUpdateSettings();
  const [paso, setPaso] = useState(1);
  const [acepta, setAcepta] = useState(false);

  async function aceptar() {
    await actualizar.mutateAsync({ privacy_accepted_at: new Date().toISOString() });
    setPaso(2);
  }

  return (
    <Pantalla
      accion={
        paso === 1 ? (
          <Button ancho="completo" disabled={!acepta || actualizar.isPending} onClick={aceptar}>
            Seguir
          </Button>
        ) : paso === 2 ? (
          <Button ancho="completo" onClick={() => setPaso(3)}>
            Seguir
          </Button>
        ) : (
          <Button ancho="completo" onClick={() => router.replace("/hoy")}>
            Empezar
          </Button>
        )
      }
    >
      <Logo ancho={96} />
      <p className="mt-6 text-pie text-texto-suave" aria-live="polite">
        Paso {paso} de 3
      </p>
      {paso === 1 ? <Privacidad acepta={acepta} setAcepta={setAcepta} /> : paso === 2 ? <Permisos /> : <Instalar />}
    </Pantalla>
  );
}

function Punto({ icono, titulo, children }: { icono: ReactNode; titulo: string; children: ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-superficie-tinte text-acento">{icono}</span>
      <div>
        <p className="text-[15px] leading-5 font-semibold text-tinta">{titulo}</p>
        <p className="mt-0.5 text-cuerpo-s text-texto">{children}</p>
      </div>
    </li>
  );
}

function Privacidad({ acepta, setAcepta }: { acepta: boolean; setAcepta: (v: boolean) => void }) {
  return (
    <>
      <Eyebrow className="mt-1">Antes de empezar</Eyebrow>
      <Titulo as="h1" className="mt-1">
        Tus clientes son <Acento>tuyos</Acento>
      </Titulo>
      <Bajada className="mt-2">Así cuido lo que me contás.</Bajada>
      <ul className="mt-6 space-y-4">
        <Punto icono={<Lock size={20} strokeWidth={1.75} aria-hidden="true" />} titulo="Solo los ves vos">
          Cada cuenta ve únicamente sus clientes. No vendemos ni compartimos datos.
        </Punto>
        <Punto icono={<Mic size={20} strokeWidth={1.75} aria-hidden="true" />} titulo="El audio se procesa con IA">
          Para pasarlo a texto y ordenar la ficha. Mando lo mínimo, nunca teléfonos ni emails, y por defecto el audio se borra después.
        </Punto>
        <Punto icono={<Download size={20} strokeWidth={1.75} aria-hidden="true" />} titulo="Los llevás o los borrás">
          Desde Perfil descargás todo o borrás tu cuenta cuando quieras.
        </Punto>
      </ul>
      <div className="mt-6">
        <Casilla checked={acepta} onChange={setAcepta}>
          Leí y acepto la{" "}
          <Link href="/privacidad" className="font-semibold text-acento underline underline-offset-2">
            política de privacidad
          </Link>
        </Casilla>
      </div>
    </>
  );
}

function Permisos() {
  const [micro, setMicro] = useState<Resultado>(null);
  const [avisos, setAvisos] = useState<Resultado>(null);

  async function probarMicrofono() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      setMicro({ ok: true, texto: "Micrófono listo." });
    } catch {
      setMicro({ ok: false, texto: "No dio permiso. Lo podés activar después desde los ajustes del navegador, o escribir las notas." });
    }
  }

  async function pedirAvisos() {
    const r = await activarAvisos(getDataSource());
    setAvisos({ ok: r.ok, texto: r.mensaje });
  }

  return (
    <>
      <Eyebrow className="mt-1">Permisos</Eyebrow>
      <Titulo as="h1" className="mt-1">
        Dos permisos, y para qué
      </Titulo>
      <Bajada className="mt-2">Los dos son opcionales. Podés darlos ahora o cuando los necesites.</Bajada>
      <div className="mt-6 space-y-3">
        <Card>
          <Punto icono={<Mic size={20} strokeWidth={1.75} aria-hidden="true" />} titulo="Micrófono">
            Para grabar notas de voz. Solo escucho cuando tocás el micrófono.
          </Punto>
          <Button className="mt-3" tamano="sm" variante="secundario" onClick={probarMicrofono}>
            Permitir micrófono
          </Button>
          <Estado r={micro} />
        </Card>
        <Card>
          <Punto icono={<Bell size={20} strokeWidth={1.75} aria-hidden="true" />} titulo="Avisos">
            Para avisarte cuando entra una propiedad que le sirve a un cliente. Nada más.
          </Punto>
          <Button className="mt-3" tamano="sm" variante="secundario" onClick={pedirAvisos}>
            Activar avisos
          </Button>
          <Estado r={avisos} />
        </Card>
      </div>
    </>
  );
}

function Estado({ r }: { r: Resultado }) {
  if (!r) return null;
  return (
    <p role="status" className={`mt-2 flex items-start gap-1.5 text-cuerpo-s ${r.ok ? "text-exito" : "text-alerta"}`}>
      {r.ok ? <Check size={18} strokeWidth={2} aria-hidden="true" className="mt-px shrink-0" /> : <CircleAlert size={18} strokeWidth={1.75} aria-hidden="true" className="mt-px shrink-0" />}
      {r.texto}
    </p>
  );
}

function Instalar() {
  const [evento, setEvento] = useState<EventoInstalar | null>(null);
  const [instalada, setInstalada] = useState(false);
  const [plataforma, setPlataforma] = useState<"iphone" | "android" | "otra">("otra");

  useEffect(() => {
    const ua = navigator.userAgent;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- se lee del navegador una vez, al montar
    setPlataforma(/iphone|ipad|ipod/i.test(ua) ? "iphone" : /android/i.test(ua) ? "android" : "otra");
    setInstalada(matchMedia("(display-mode: standalone)").matches);
    const alPedir = (e: Event) => {
      e.preventDefault();
      setEvento(e as EventoInstalar);
    };
    window.addEventListener("beforeinstallprompt", alPedir);
    return () => window.removeEventListener("beforeinstallprompt", alPedir);
  }, []);

  return (
    <>
      <Eyebrow className="mt-1">Último paso</Eyebrow>
      <Titulo as="h1" className="mt-1">
        Tenela a mano, como <Acento>una app</Acento>
      </Titulo>
      <Bajada className="mt-2">Instalala en la pantalla de inicio: abre al toque y te llegan los avisos.</Bajada>

      {instalada ? (
        <p className="mt-6 flex items-center gap-2 text-cuerpo text-exito" role="status">
          <Check size={20} strokeWidth={2} aria-hidden="true" />
          Ya está instalada.
        </p>
      ) : (
        <div className="mt-6 space-y-3">
          {evento ? (
            <Button
              ancho="completo"
              icono={<Download size={20} strokeWidth={1.75} aria-hidden="true" />}
              onClick={async () => {
                await evento.prompt();
                const r = await evento.userChoice;
                if (r.outcome === "accepted") setInstalada(true);
              }}
            >
              Instalar Kairos
            </Button>
          ) : null}
          <Card className={plataforma === "android" ? "order-first" : ""}>
            <Punto icono={<Share size={20} strokeWidth={1.75} aria-hidden="true" />} titulo="En iPhone (Safari)">
              Tocá Compartir y elegí &quot;Agregar a inicio&quot;. En iPhone, los avisos solo llegan con Kairos instalada así.
            </Punto>
          </Card>
          <Card>
            <Punto icono={<Smartphone size={20} strokeWidth={1.75} aria-hidden="true" />} titulo="En Android (Chrome)">
              Tocá el menú ⋮ y elegí &quot;Instalar app&quot; o &quot;Agregar a la pantalla principal&quot;.
            </Punto>
          </Card>
        </div>
      )}
    </>
  );
}
