import { Bell, Building2, Check, CircleAlert, Clock, House, Mic, TriangleAlert, User, Users, X } from "lucide-react";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Logo, Simbolo } from "@/components/brand/logo";
import { Avatar, PuntoLima } from "@/components/ui/avatar";
import { Acento, Bajada, Eyebrow, Titulo } from "@/components/ui/bloque";
import { Button } from "@/components/ui/button";
import { Card, CardNumero, CardTexto, CardTitulo } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { ThemeSwitch } from "@/components/ui/theme-switch";
import { formatMonto, formatMontoCorto } from "@/lib/format";
import { RepetirAviso } from "./repetir-aviso";

export const metadata: Metadata = { title: "Componentes" };

const TOKENS: Array<[string, string]> = [
  ["fondo", "Fondo de la pantalla"],
  ["superficie", "Tarjetas, paneles, campos"],
  ["superficie-tinte", "Zonas resaltadas, seleccionado"],
  ["tinta", "Títulos y texto principal"],
  ["texto", "Párrafos"],
  ["texto-suave", "Pies y metadatos"],
  ["acento", "Eyebrows, palabra destacada, links"],
  ["sobre-acento", "Texto sobre botón principal"],
  ["destacado", "Tarjeta destacada"],
  ["sobre-destacado", "Títulos en la destacada"],
  ["texto-destacado", "Párrafos en la destacada"],
  ["chip", "Fondo de chips y citas"],
  ["sobre-chip", "Texto de chips"],
  ["linea", "Bordes y divisores"],
  ["linea-control", "Borde de campos y controles"],
  ["foco", "Anillo de foco"],
  ["exito", "Estado"],
  ["alerta", "Estado"],
  ["error", "Estado"],
];

const MARCA: Array<[string, string]> = [
  ["noche", "#1B1345"],
  ["papel", "#F5F3FE"],
  ["violeta", "#5A41DF"],
  ["lima", "#C5F26A"],
  ["lavanda", "#A897FF"],
  ["lila", "#E4DEFF"],
];

const ESCALA: Array<[string, string, string]> = [
  ["text-titulo-xl", "Título XL · 56/60", "Vender 2"],
  ["text-titulo-l", "Título L · 40/46", "3 oportunidades"],
  ["text-titulo-m", "Título M · 28/34", "Esta propiedad le sirve a Martina"],
  ["text-titulo-s", "Título S · 22/28", "Buenas tardes, Lucía"],
  ["text-subtitulo", "Subtítulo · 20/28", "Oportunidades nuevas"],
  ["text-cuerpo-l", "Cuerpo L · 18/28", "Hablá tranquila, después yo lo ordeno."],
  ["text-cuerpo", "Cuerpo · 16/24", "Busca 3 ambientes en Palermo, hasta USD 180.000."],
  ["text-cuerpo-s", "Cuerpo S · 14/20", "Hace 4 meses sin hablar · buscaba 2 amb en Caballito"],
  ["text-boton", "Botón · 15/20", "Mandársela a Martina"],
  ["text-eyebrow", "Eyebrow · 13/16", "Tu cartera · hoy"],
  ["text-pie", "Pie · 12/16", "Kairos · hace 2 min"],
];

function Seccion({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="border-t border-linea py-8">
      <Eyebrow className="mb-4">{titulo}</Eyebrow>
      {children}
    </section>
  );
}

const icono = { size: 20, strokeWidth: 1.75, "aria-hidden": true } as const;

export default function DevUi() {
  return (
    <main className="mx-auto w-full max-w-[1040px] px-4 pb-24 md:px-16">
      <header className="flex flex-wrap items-center justify-between gap-4 py-6">
        <Logo ancho={120} />
        <ThemeSwitch />
      </header>

      <Eyebrow>Fase 0 · Base de diseño</Eyebrow>
      <Titulo as="h1" tamano="l" className="mt-2">
        Las piezas de <Acento>Kairos</Acento>
      </Titulo>
      <Bajada className="mt-3 mb-8 max-w-[52ch]">
        Todos los componentes del manual de marca, con los mismos tokens en los dos temas. Cambiá el tema arriba:
        el acento pasa de violeta a lima solo.
      </Bajada>

      <Seccion titulo="Logo">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <figure>
            <div className="flex h-36 items-center justify-center rounded-lg bg-noche px-6">
              <Logo version="negativo" ancho={160} />
            </div>
            <figcaption className="mt-2 text-pie text-texto-suave">Negativo · sobre noche (principal)</figcaption>
          </figure>
          <figure>
            <div className="flex h-36 items-center justify-center rounded-lg border border-linea bg-papel px-6">
              <Logo version="positivo" ancho={160} />
            </div>
            <figcaption className="mt-2 text-pie text-texto-suave">Positivo · sobre papel</figcaption>
          </figure>
          <figure>
            <div className="flex h-36 items-center justify-center rounded-lg bg-noche">
              <Simbolo tamano={72} />
            </div>
            <figcaption className="mt-2 text-pie text-texto-suave">Símbolo · avatar de Kairos y avisos</figcaption>
          </figure>
          <figure>
            <div className="flex h-36 items-center justify-center rounded-lg border border-linea bg-superficie">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/icono-app.png" alt="Ícono de la app Kairos" width={72} height={72} />
            </div>
            <figcaption className="mt-2 text-pie text-texto-suave">Ícono de app</figcaption>
          </figure>
        </div>
        <p className="mt-4 max-w-[70ch] text-cuerpo-s text-texto-suave">
          Son los PNG originales que venían dentro del prototipo. Faltan los SVG originales y los monocromos (blanco
          y tinta); con ellos se suma el anillo de marca recortado por el borde.
        </p>
      </Seccion>

      <Seccion titulo="Colores de marca">
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {MARCA.map(([nombre, hex]) => (
            <li key={nombre}>
              <div className="h-16 rounded-md border border-linea" style={{ background: `var(--${nombre})` }} />
              <p className="mt-2 text-[14px] leading-5 font-semibold text-tinta">{nombre}</p>
              <p className="text-pie text-texto-suave">{hex}</p>
            </li>
          ))}
        </ul>
      </Seccion>

      <Seccion titulo="Tokens de interfaz">
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {TOKENS.map(([nombre, uso]) => (
            <li key={nombre} className="flex items-center gap-3">
              <span
                className="size-11 shrink-0 rounded-md border border-linea-control"
                style={{ background: `var(--${nombre})` }}
              />
              <span className="min-w-0">
                <span className="block text-[14px] leading-5 font-semibold text-tinta">{nombre}</span>
                <span className="block text-pie text-texto-suave">{uso}</span>
              </span>
            </li>
          ))}
        </ul>
      </Seccion>

      <Seccion titulo="Tipografía · Fraunces para decir, Inter para leer">
        <p className="text-cifra text-tinta">
          92<span className="text-acento">%</span>
        </p>
        <p className="mt-1 mb-6 text-pie text-texto-suave">Cifra · 96/96</p>
        <dl className="space-y-5">
          {ESCALA.map(([clase, nombre, ejemplo]) => (
            <div key={clase}>
              <dd className={`${clase} ${clase.includes("eyebrow") ? "text-acento" : "text-tinta"} break-words`}>
                {ejemplo}
              </dd>
              <dt className="mt-1 text-pie text-texto-suave">{nombre}</dt>
            </div>
          ))}
        </dl>
      </Seccion>

      <Seccion titulo="Eyebrow y título">
        <Eyebrow>Propuesta de valor</Eyebrow>
        <Titulo className="mt-2 max-w-[22ch]">
          Kairos recuerda a cada cliente y avisa cuando aparece <Acento>su oportunidad</Acento>
        </Titulo>
        <Bajada className="mt-3">Un audio por WhatsApp alcanza: la IA lo ordena solo.</Bajada>
      </Seccion>

      <Seccion titulo="Aviso de oportunidad">
        <RepetirAviso />
      </Seccion>

      <Seccion titulo="Tarjetas: normal y destacada">
        <div className="grid gap-3 sm:grid-cols-3">
          <Card>
            <CardNumero>01</CardNumero>
            <CardTitulo>Captura sin esfuerzo</CardTitulo>
            <CardTexto>Un audio por WhatsApp alcanza: la IA lo ordena solo.</CardTexto>
          </Card>
          <Card>
            <CardNumero>02</CardNumero>
            <CardTitulo>Memoria de cada cliente</CardTitulo>
            <CardTexto>Qué busca, cuánto puede pagar, para cuándo y qué descartó.</CardTexto>
          </Card>
          <Card destacada>
            <CardNumero destacada>03</CardNumero>
            <CardTitulo destacada>Aviso en el momento justo</CardTitulo>
            <CardTexto>Entra una propiedad y Kairos te dice a quién le sirve.</CardTexto>
          </Card>
        </div>
        <p className="mt-3 text-pie text-texto-suave">Borde de 1 px, sin sombra. Una sola destacada por vista.</p>
      </Seccion>

      <Seccion titulo="Botones">
        <div className="flex flex-wrap items-center gap-3">
          <Button>Avisar a Martina</Button>
          <Button variante="secundario">Ver ficha</Button>
          <Button variante="terciario">Ahora no</Button>
          <Button disabled>Enviar</Button>
        </div>
        <div className="mt-4 max-w-[390px]">
          <Button ancho="completo" icono={<Mic {...icono} />}>
            Grabar audio
          </Button>
        </div>
      </Seccion>

      <Seccion titulo="Chips">
        <div className="flex flex-wrap gap-2">
          <Chip>3 ambientes</Chip>
          <Chip>Palermo</Chip>
          <Chip>Hasta {formatMontoCorto(180000, "USD")}</Chip>
          <Chip variante="oportunidad">Nueva oportunidad</Chip>
          <Chip variante="descarte">Descartó PB</Chip>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Chip icono={<Check size={14} strokeWidth={2.25} aria-hidden="true" />}>Balcón</Chip>
          <Chip variante="descarte" icono={<X size={14} strokeWidth={2.25} aria-hidden="true" />}>
            Planta baja
          </Chip>
          <Chip variante="exito" icono={<Check size={14} strokeWidth={2.25} aria-hidden="true" />}>
            Enviado
          </Chip>
          <Chip variante="alerta" icono={<TriangleAlert size={14} strokeWidth={2} aria-hidden="true" />}>
            A confirmar
          </Chip>
          <Chip variante="error" icono={<CircleAlert size={14} strokeWidth={2} aria-hidden="true" />}>
            No se pudo enviar
          </Chip>
        </div>
        <p className="mt-3 text-pie text-texto-suave">Los estados van siempre con ícono o palabra, nunca solo color.</p>
      </Seccion>

      <Seccion titulo="Avatares y fila de cliente">
        <div className="flex items-center gap-3">
          <Avatar nombre="Lucía F." tamano="sm" />
          <Avatar nombre="Martina Gómez" />
          <Avatar nombre="Sofía y Pablo" tamano="lg" />
        </div>
        <Card className="mt-4 flex max-w-[390px] items-center gap-3">
          <Avatar nombre="Andrés Molina" />
          <div className="min-w-0 flex-1">
            <p className="text-[15px] leading-5 font-semibold text-tinta">Andrés Molina</p>
            <p className="text-[13px] leading-[18px] text-texto-suave">
              Hace 4 meses sin hablar · buscaba 2 amb en Caballito
            </p>
          </div>
          <Button variante="secundario" tamano="sm">
            Escribirle
          </Button>
        </Card>
      </Seccion>

      <Seccion titulo="Iconografía · Lucide, trazo 1,75">
        <div className="flex flex-wrap items-center gap-5 text-texto">
          <House size={24} strokeWidth={1.75} aria-label="Hoy" className="text-acento" />
          <Users size={24} strokeWidth={1.75} aria-label="Clientes" />
          <Building2 size={24} strokeWidth={1.75} aria-label="Propiedades" />
          <User size={24} strokeWidth={1.75} aria-label="Perfil" />
          <span className="h-6 w-px bg-linea" />
          <Mic {...icono} />
          <Bell {...icono} />
          <Clock {...icono} />
          <Check {...icono} />
        </div>
        <p className="mt-3 text-pie text-texto-suave">
          24 px en la navegación, 20 px en listas y botones. Color texto en reposo y acento cuando están activos.
        </p>
      </Seccion>

      <Seccion titulo="Punto lima y cifras">
        <div className="flex max-w-[390px] items-center gap-3 rounded-lg bg-noche p-4 text-[#b8b1df]">
          <PuntoLima />
          <span className="text-cuerpo-s">Buscando propiedades para Martina…</span>
        </div>
        <p className="mt-4 text-cuerpo text-texto">
          <span className="text-titulo-s text-tinta">{formatMonto(172000, "USD")}</span> · Expensas{" "}
          {formatMonto(185000, "ARS")}
        </p>
      </Seccion>
    </main>
  );
}
