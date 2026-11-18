"use client";

import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, ChevronDown, CircleAlert, Mic, Square, UserPlus } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { Pantalla } from "@/components/app/pantalla";
import { Avatar } from "@/components/ui/avatar";
import { Bajada, Eyebrow, Titulo } from "@/components/ui/bloque";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Campo } from "@/components/ui/campo";
import { ChipBoton } from "@/components/ui/chip";
import { Hoja } from "@/components/ui/hoja";
import type { NotaExtraida } from "@/lib/ai/extract/schema";
import { guionMock } from "@/lib/ai/transcribe/guiones";
import { BARRAS, LIMITE_SEGUNDOS, formatDuracion, useGrabadora, type ModoTranscripcion } from "@/lib/audio/grabadora";
import { cn } from "@/lib/cn";
import { getDataSource, type Buyer } from "@/lib/data";
import { useAgent, useBuyers } from "@/lib/data/hooks";
import { useSession } from "@/lib/session/provider";
import { clientesConEseNombre, extraer, guardarNota, type Destino, type NotaGuardada } from "@/lib/notas/guardar";

type Paso =
  | { tipo: "capturar" }
  | { tipo: "ordenando" }
  | { tipo: "confirmar"; nota: NotaExtraida; candidatos: Buyer[] }
  | { tipo: "pedir-nombre"; nota: NotaExtraida | null; motivo: "sin-nombre" | "sin-extraccion" }
  | { tipo: "sin-extraccion"; error: string }
  | { tipo: "listo"; resultado: NotaGuardada };

const primerNombre = (n: string) => n.split(" ")[0];

export function NuevaNota({ modo }: { modo: ModoTranscripcion }) {
  const router = useRouter();
  const params = useSearchParams();
  const sesion = useSession();
  const queryClient = useQueryClient();
  const clientes = useBuyers();
  const agente = useAgent();

  const [clienteId, setClienteId] = useState<string | null>(params.get("cliente"));
  const [eligiendo, setEligiendo] = useState(false);
  const [forma, setForma] = useState<"grabar" | "escribir">("grabar");
  const [escrito, setEscrito] = useState("");
  const [paso, setPaso] = useState<Paso>({ tipo: "capturar" });
  const [error, setError] = useState<string | null>(null);

  const lista = useMemo(() => clientes.data ?? [], [clientes.data]);
  const cliente = clienteId ? (lista.find((c) => c.id === clienteId) ?? null) : null;
  const existeMartina = lista.some((c) => c.name.startsWith("Martina"));
  const guion = modo === "mock" ? guionMock(cliente ? { nombre: cliente.name } : null, existeMartina) : undefined;

  const grabadora = useGrabadora({ modo, guion });
  const transcripcion = (forma === "grabar" ? grabadora.texto : escrito).trim();
  const grabando = grabadora.estado === "grabando" || grabadora.estado === "pidiendo" || grabadora.estado === "transcribiendo";
  const listoParaArmar = transcripcion.length >= 10 && !grabando;
  const borraAudio = agente.data?.settings.delete_audio_after_transcribe ?? true;

  const volverA = cliente ? `/clientes/${cliente.id}` : "/hoy";

  async function refrescar() {
    await queryClient.invalidateQueries({ queryKey: [sesion?.agentId] });
  }

  async function guardar(destino: Destino, nota: NotaExtraida | null) {
    setPaso({ tipo: "ordenando" });
    try {
      const resultado = await guardarNota({
        destino,
        transcripcion,
        tipo: forma === "grabar" ? "audio" : "text",
        duracion: forma === "grabar" ? grabadora.segundos : null,
        nota,
      });
      await refrescar();
      if (!nota) {
        router.push(`/clientes/${resultado.cliente.id}`);
        return;
      }
      setPaso({ tipo: "listo", resultado });
    } catch (e) {
      setError(e instanceof Error ? e.message : "No pudimos guardar la nota.");
      setPaso({ tipo: "capturar" });
    }
  }

  async function armarFicha() {
    setError(null);
    setPaso({ tipo: "ordenando" });
    const ficha = cliente ? await getDataSource().buyers.getCriteria(cliente.id) : null;
    const respuesta = await extraer(transcripcion, ficha);
    if (!respuesta.ok) {
      setPaso({ tipo: "sin-extraccion", error: respuesta.error });
      return;
    }
    const nota = respuesta.nota;
    if (cliente) return guardar({ tipo: "existente", buyerId: cliente.id }, nota);

    const nombre = nota.cliente.nombre?.trim();
    if (!nombre) return setPaso({ tipo: "pedir-nombre", nota, motivo: "sin-nombre" });
    const candidatos = clientesConEseNombre(nombre, lista);
    if (candidatos.length) return setPaso({ tipo: "confirmar", nota, candidatos });
    return guardar({ tipo: "nuevo", nombre, telefono: nota.cliente.telefono }, nota);
  }

  function otraNota() {
    grabadora.reiniciar();
    setEscrito("");
    setError(null);
    setPaso({ tipo: "capturar" });
  }

  // --- Pasos después de "Armar ficha" -----------------------------------------

  if (paso.tipo === "ordenando") {
    return (
      <Pantalla>
        <div className="flex min-h-[60dvh] flex-col items-center justify-center text-center" role="status">
          <span className="size-3 animate-pulse rounded-full bg-acento" aria-hidden="true" />
          <p className="mt-4 text-titulo-s text-tinta">Ordenando lo que me contaste…</p>
          <p className="mt-1 text-cuerpo-s text-texto-suave">Un segundo.</p>
        </div>
      </Pantalla>
    );
  }

  if (paso.tipo === "listo") {
    const { cliente: c, nuevo, frases } = paso.resultado;
    return (
      <Pantalla
        accion={
          <div className="space-y-2">
            <ButtonLink href={`/clientes/${c.id}`} ancho="completo">
              Ver la ficha de {primerNombre(c.name)}
            </ButtonLink>
            <Button variante="terciario" ancho="completo" onClick={otraNota}>
              Grabar otra nota
            </Button>
          </div>
        }
      >
        <div className="mt-6">
          <Eyebrow>Nota guardada</Eyebrow>
          <Titulo as="h1" className="mt-1">
            {nuevo ? `Listo, guardé a ${c.name}` : `Actualicé la ficha de ${primerNombre(c.name)}`}
          </Titulo>
          {c.summary ? <Bajada className="mt-2">{c.summary}.</Bajada> : null}
        </div>
        <Card className="mt-5">
          <h2 className="text-[17px] leading-[22px] font-semibold text-tinta">{nuevo ? "Lo que entendí" : "Qué cambió"}</h2>
          {frases.length ? (
            <ul className="mt-2 space-y-2">
              {frases.map((f) => (
                <li key={f} className="flex items-start gap-2 text-cuerpo-s text-tinta">
                  <Check size={18} strokeWidth={2} aria-hidden="true" className="mt-px shrink-0 text-exito" />
                  {f}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-cuerpo-s text-texto">La nota quedó en su historial. La ficha ya tenía todo lo que contaste.</p>
          )}
        </Card>
      </Pantalla>
    );
  }

  if (paso.tipo === "confirmar") {
    const nombreNota = paso.nota.cliente.nombre ?? "";
    return (
      <Pantalla>
        <div className="mt-6">
          <Eyebrow>Antes de guardar</Eyebrow>
          <Titulo as="h1" className="mt-1">
            {paso.candidatos.length === 1 ? `¿Es ${paso.candidatos[0].name}?` : `¿Cuál ${nombreNota} es?`}
          </Titulo>
          <Bajada className="mt-2">Ya tenés {paso.candidatos.length === 1 ? "un cliente" : "clientes"} con ese nombre. No quiero duplicarlo.</Bajada>
        </div>
        <div className="mt-6 space-y-2">
          {paso.candidatos.map((c) => (
            <Button
              key={c.id}
              ancho="completo"
              onClick={() => {
                setClienteId(c.id);
                void guardar({ tipo: "existente", buyerId: c.id }, paso.nota);
              }}
            >
              Sí, es {paso.candidatos.length === 1 ? primerNombre(c.name) : c.name}
            </Button>
          ))}
          <Button
            variante="secundario"
            ancho="completo"
            onClick={() => guardar({ tipo: "nuevo", nombre: nombreNota, telefono: paso.nota.cliente.telefono }, paso.nota)}
          >
            No, es otra persona
          </Button>
        </div>
      </Pantalla>
    );
  }

  if (paso.tipo === "pedir-nombre") {
    return (
      <PedirNombre
        sinExtraccion={paso.motivo === "sin-extraccion"}
        transcripcion={transcripcion}
        onGuardar={(nombre) => guardar({ tipo: "nuevo", nombre, telefono: paso.nota?.cliente.telefono ?? null }, paso.nota)}
        onVolver={() => setPaso({ tipo: "capturar" })}
      />
    );
  }

  if (paso.tipo === "sin-extraccion") {
    return (
      <Pantalla
        accion={
          <div className="space-y-2">
            {cliente ? (
              <Button ancho="completo" onClick={() => guardar({ tipo: "existente", buyerId: cliente.id }, null)}>
                Guardar la nota y abrir la ficha
              </Button>
            ) : (
              <Button ancho="completo" onClick={() => setPaso({ tipo: "pedir-nombre", nota: null, motivo: "sin-extraccion" })}>
                Guardar la nota en un cliente nuevo
              </Button>
            )}
            <Button variante="terciario" ancho="completo" onClick={armarFicha}>
              Probar de nuevo
            </Button>
          </div>
        }
      >
        <div className="mt-6">
          <Eyebrow>No salió</Eyebrow>
          <Titulo as="h1" className="mt-1">
            No pude ordenar esta nota
          </Titulo>
          <Bajada className="mt-2">
            La guardo tal cual en el historial y completás la ficha a mano. {paso.error}
          </Bajada>
        </div>
        <Card className="mt-5">
          <p className="text-pie text-texto-suave">Lo que entendí</p>
          <blockquote className="mt-2 rounded-md bg-chip px-3 py-2 text-cuerpo-s text-tinta">{transcripcion}</blockquote>
        </Card>
      </Pantalla>
    );
  }

  // --- Captura ----------------------------------------------------------------

  const etiquetaEstado =
    grabadora.estado === "grabando"
      ? "Grabando"
      : grabadora.estado === "pidiendo"
        ? "Pidiendo el micrófono"
        : grabadora.estado === "transcribiendo"
          ? "Transcribiendo"
          : grabadora.estado === "listo"
            ? "Nota lista"
            : "Listo para grabar";

  return (
    <Pantalla
      accion={
        <Button ancho="completo" disabled={!listoParaArmar} onClick={armarFicha}>
          Armar ficha
        </Button>
      }
    >
      <header className="-mx-2 flex items-center gap-1">
        <Link
          href={volverA}
          aria-label="Volver"
          className="flex size-11 shrink-0 items-center justify-center rounded-full text-tinta hover:bg-superficie-tinte"
        >
          <ArrowLeft size={24} strokeWidth={1.75} aria-hidden="true" />
        </Link>
        <h1 className="flex-1 text-[17px] leading-[22px] font-semibold text-tinta">Nueva nota</h1>
      </header>

      <button
        type="button"
        onClick={() => setEligiendo(true)}
        disabled={grabando}
        className="mt-3 flex min-h-12 w-full items-center gap-3 rounded-lg border border-linea bg-superficie px-3 text-left hover:bg-superficie-tinte disabled:opacity-60"
        aria-label={`Cliente: ${cliente ? cliente.name : "cliente nuevo"}. Cambiar`}
      >
        {cliente ? (
          <Avatar nombre={cliente.name} tamano="sm" />
        ) : (
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-chip text-sobre-chip">
            <UserPlus size={16} strokeWidth={2} aria-hidden="true" />
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] leading-5 font-semibold text-tinta">
            {cliente ? cliente.name : "Cliente nuevo"}
          </span>
          {!cliente ? <span className="block text-pie text-texto-suave">Saco el nombre del audio</span> : null}
        </span>
        <ChevronDown size={20} strokeWidth={1.75} aria-hidden="true" className="shrink-0 text-texto-suave" />
      </button>

      <div className="mt-3 flex gap-2" role="group" aria-label="Cómo cargar la nota">
        <ChipBoton activo={forma === "grabar"} onClick={() => setForma("grabar")}>
          Grabar
        </ChipBoton>
        <ChipBoton
          activo={forma === "escribir"}
          onClick={() => {
            if (grabando) void grabadora.parar();
            setForma("escribir");
          }}
        >
          Escribir
        </ChipBoton>
      </div>

      {forma === "grabar" ? (
        <>
          <div className="mt-6">
            <p className="flex items-center gap-2 text-eyebrow text-acento">
              {grabadora.estado === "grabando" ? (
                <span className="size-2 rounded-full bg-error" aria-hidden="true" />
              ) : grabadora.estado === "listo" ? (
                <span className="size-2 rounded-full bg-exito" aria-hidden="true" />
              ) : null}
              {etiquetaEstado}
            </p>
            <Titulo as="h2" className="mt-1">
              Contame cómo te fue
            </Titulo>
            <Bajada className="mt-1">Hablá tranquila, después yo lo ordeno.</Bajada>
          </div>

          <Onda niveles={grabadora.niveles} activa={grabadora.estado === "grabando"} />

          <div className="flex flex-col items-center">
            <button
              type="button"
              onClick={() => (grabadora.estado === "grabando" ? void grabadora.parar() : void grabadora.empezar())}
              disabled={grabadora.estado === "pidiendo" || grabadora.estado === "transcribiendo"}
              aria-label={grabadora.estado === "grabando" ? "Terminar la grabación" : grabadora.estado === "listo" ? "Grabar de nuevo" : "Empezar a grabar"}
              className={cn(
                "flex size-[72px] items-center justify-center rounded-full text-sobre-acento transition-colors duration-150 disabled:opacity-60",
                grabadora.estado === "grabando" ? "bg-error text-white" : "bg-acento hover:bg-acento-presionado",
              )}
            >
              {grabadora.estado === "grabando" ? (
                <Square size={26} strokeWidth={2} fill="currentColor" aria-hidden="true" />
              ) : (
                <Mic size={30} strokeWidth={1.75} aria-hidden="true" />
              )}
            </button>
            <p className="mt-2 text-cuerpo-s text-texto-suave" aria-live="off">
              <span className="font-semibold text-tinta tabular-nums">{formatDuracion(grabadora.segundos)}</span> /{" "}
              {formatDuracion(LIMITE_SEGUNDOS)}
            </p>
          </div>

          <Card className="mt-5">
            <p
              className={cn(
                "flex items-center gap-1.5 text-[13px] leading-[18px] font-semibold",
                grabadora.estado === "listo" ? "text-exito" : "text-acento",
              )}
              aria-live="polite"
            >
              {grabadora.estado === "listo" ? <Check size={16} strokeWidth={2.25} aria-hidden="true" /> : null}
              {grabadora.estado === "listo"
                ? "Listo · entendí todo"
                : grabadora.estado === "grabando" || grabadora.estado === "transcribiendo"
                  ? "Transcribiendo…"
                  : "Lo que digas aparece acá"}
            </p>
            {grabadora.estado === "listo" ? (
              <>
                <label htmlFor="transcripcion" className="sr-only">
                  Transcripción, la podés corregir
                </label>
                <textarea
                  id="transcripcion"
                  value={grabadora.texto}
                  onChange={(e) => grabadora.setTexto(e.target.value)}
                  rows={6}
                  className="mt-2 block w-full resize-y rounded-md border border-linea-control bg-superficie px-3 py-2 text-cuerpo text-tinta"
                />
                <p className="mt-1 text-pie text-texto-suave">Si algo se entendió mal, corregilo antes de armar la ficha.</p>
              </>
            ) : (
              <p className="mt-2 min-h-[72px] text-cuerpo text-tinta">
                {grabadora.texto || (
                  <span className="text-texto-suave">
                    {modo === "openai" && grabadora.estado === "grabando" ? "Te muestro el texto cuando termines." : "Tocá el micrófono y contame."}
                  </span>
                )}
              </p>
            )}
          </Card>
        </>
      ) : (
        <div className="mt-6">
          <Titulo as="h2">Contame cómo te fue</Titulo>
          <label htmlFor="nota-escrita" className="mt-4 mb-1 block text-[14px] leading-5 font-semibold text-tinta">
            Tu nota
          </label>
          <textarea
            id="nota-escrita"
            value={escrito}
            onChange={(e) => setEscrito(e.target.value)}
            rows={8}
            placeholder="Vi a Martina el de Thames. Busca 3 ambientes en Palermo, hasta 180 mil dólares…"
            className="block w-full resize-y rounded-md border border-linea-control bg-superficie px-4 py-3 text-cuerpo text-tinta placeholder:text-texto-suave"
          />
        </div>
      )}

      {grabadora.error || error ? (
        <p role="alert" className="mt-3 flex items-start gap-1.5 text-cuerpo-s text-error">
          <CircleAlert size={18} strokeWidth={1.75} aria-hidden="true" className="mt-px shrink-0" />
          {error ?? grabadora.error}
        </p>
      ) : null}

      <p className="mt-5 text-pie text-texto-suave">
        {forma === "grabar"
          ? `El audio se pasa a texto con un servicio de IA${borraAudio ? " y se borra después de transcribirlo" : ""}. `
          : ""}
        Para ordenar la ficha mando solo el texto de la nota, nunca el teléfono ni el email del cliente.
      </p>

      <Hoja abierta={eligiendo} onCerrar={() => setEligiendo(false)} titulo="¿De quién me contás?">
        <ul className="-mx-1 space-y-1">
          <li>
            <button
              type="button"
              onClick={() => {
                setClienteId(null);
                setEligiendo(false);
              }}
              className={cn(
                "flex min-h-12 w-full items-center gap-3 rounded-md px-2 text-left hover:bg-superficie-tinte",
                !clienteId && "bg-superficie-tinte",
              )}
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-chip text-sobre-chip">
                <UserPlus size={20} strokeWidth={1.75} aria-hidden="true" />
              </span>
              <span>
                <span className="block text-[15px] leading-5 font-semibold text-tinta">Cliente nuevo</span>
                <span className="block text-pie text-texto-suave">Saco el nombre del audio</span>
              </span>
            </button>
          </li>
          {lista.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => {
                  setClienteId(c.id);
                  setEligiendo(false);
                }}
                className={cn(
                  "flex min-h-12 w-full items-center gap-3 rounded-md px-2 py-1.5 text-left hover:bg-superficie-tinte",
                  clienteId === c.id && "bg-superficie-tinte",
                )}
              >
                <Avatar nombre={c.name} />
                <span className="min-w-0">
                  <span className="block truncate text-[15px] leading-5 font-semibold text-tinta">{c.name}</span>
                  {c.summary ? <span className="block truncate text-pie text-texto-suave">{c.summary}</span> : null}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </Hoja>
    </Pantalla>
  );
}

/** La onda del prototipo: barras más fuertes al centro, que suben con la voz. */
function Onda({ niveles, activa }: { niveles: number[]; activa: boolean }) {
  return (
    <div className="my-6 flex h-16 items-center justify-center gap-[3px]" aria-hidden="true">
      {niveles.map((n, i) => {
        const distancia = Math.abs(i - (BARRAS - 1) / 2) / (BARRAS / 2);
        return (
          <span
            key={i}
            className="w-1 rounded-full bg-acento transition-[height] duration-75"
            style={{ height: activa ? `${Math.round(4 + n * 56)}px` : "4px", opacity: 1 - distancia * 0.55 }}
          />
        );
      })}
    </div>
  );
}

function PedirNombre({
  sinExtraccion,
  transcripcion,
  onGuardar,
  onVolver,
}: {
  sinExtraccion: boolean;
  transcripcion: string;
  onGuardar: (nombre: string) => void;
  onVolver: () => void;
}) {
  const [nombre, setNombre] = useState("");
  const [error, setError] = useState<string | null>(null);
  return (
    <Pantalla>
      <div className="mt-6">
        <Eyebrow>Cliente nuevo</Eyebrow>
        <Titulo as="h1" className="mt-1">
          ¿Cómo se llama?
        </Titulo>
        <Bajada className="mt-2">
          {sinExtraccion ? "Guardo la nota en su historial y después completás la ficha." : "No escuché el nombre en la nota."}
        </Bajada>
      </div>
      <form
        className="mt-6 space-y-4"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (!nombre.trim()) return setError("Decime cómo se llama.");
          onGuardar(nombre.trim());
        }}
      >
        <Campo etiqueta="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} autoCapitalize="words" autoComplete="off" error={error} />
        <Button type="submit" ancho="completo">
          Guardar
        </Button>
        <Button variante="terciario" ancho="completo" onClick={onVolver}>
          Volver a la nota
        </Button>
      </form>
      <blockquote className="mt-6 rounded-md bg-chip px-3 py-2 text-cuerpo-s text-tinta">{transcripcion}</blockquote>
    </Pantalla>
  );
}
