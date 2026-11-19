"use client";

import { ArrowLeft, Check, CircleAlert, Download, FileUp } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { FormPropiedad } from "@/components/app/form-propiedad";
import { Pantalla } from "@/components/app/pantalla";
import { Bajada, Eyebrow, Titulo } from "@/components/ui/bloque";
import { Button, ButtonLink } from "@/components/ui/button";
import { Campo } from "@/components/ui/campo";
import { Card } from "@/components/ui/card";
import { ChipBoton } from "@/components/ui/chip";
import type { RespuestaAviso } from "@/lib/ai/listing/schema";
import { DataError, getDataSource } from "@/lib/data";
import { useSession } from "@/lib/session/provider";
import { useQueryClient } from "@tanstack/react-query";
import { filasAPropiedades, parsearCsv, type FilaImportada } from "@/lib/domain/csv";
import { BORRADOR_VACIO, avisoABorrador, type Borrador } from "@/lib/domain/propiedad";

type Modo = "manual" | "pegar" | "importar";

export function AltaPropiedad() {
  const router = useRouter();
  const [modo, setModo] = useState<Modo>("manual");
  const irA = (id: string) => router.push(`/propiedades/${id}`);

  return (
    <Pantalla>
      <header className="-mx-2 flex items-center gap-1">
        <Link
          href="/propiedades"
          aria-label="Volver a propiedades"
          className="flex size-11 shrink-0 items-center justify-center rounded-full text-tinta hover:bg-superficie-tinte"
        >
          <ArrowLeft size={24} strokeWidth={1.75} aria-hidden="true" />
        </Link>
        <h1 className="flex-1 text-[17px] leading-[22px] font-semibold text-tinta">Cargar propiedad</h1>
      </header>

      <div className="mt-3 flex gap-2" role="group" aria-label="Cómo cargarla">
        <ChipBoton activo={modo === "manual"} onClick={() => setModo("manual")}>
          A mano
        </ChipBoton>
        <ChipBoton activo={modo === "pegar"} onClick={() => setModo("pegar")}>
          Pegar aviso
        </ChipBoton>
        <ChipBoton activo={modo === "importar"} onClick={() => setModo("importar")}>
          Importar CSV
        </ChipBoton>
      </div>

      <div className="mt-6">
        {modo === "manual" ? (
          <>
            <Titulo as="h2" tamano="s">
              Los datos de la propiedad
            </Titulo>
            <Bajada className="mt-1 mb-5">Con dirección, barrio, precio y ambientes alcanza para empezar.</Bajada>
            <FormPropiedad inicial={BORRADOR_VACIO} source="manual" onGuardada={(p) => irA(p.id)} />
          </>
        ) : modo === "pegar" ? (
          <PegarAviso onGuardada={irA} />
        ) : (
          <Importar />
        )}
      </div>
    </Pantalla>
  );
}

function PegarAviso({ onGuardada }: { onGuardada: (id: string) => void }) {
  const [texto, setTexto] = useState("");
  const [url, setUrl] = useState("");
  const [leyendo, setLeyendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<{ borrador: Borrador; dudas: string[] } | null>(null);

  async function leer() {
    setError(null);
    if (texto.trim().length < 20) return setError("Pegá el texto completo del aviso: título, precio, ambientes y descripción.");
    let link: string | null = null;
    if (url.trim()) {
      try {
        link = new URL(url.trim()).toString();
      } catch {
        return setError("Ese link no parece completo. Tiene que empezar con https://");
      }
    }
    setLeyendo(true);
    try {
      const r = await fetch("/api/ai/listing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto, url: link }),
      });
      const json = (await r.json()) as RespuestaAviso;
      if (!json.ok) throw new Error(json.error);
      setResultado({ borrador: avisoABorrador(json.aviso, { texto, url: link }), dudas: json.aviso.dudas });
    } catch (e) {
      setError(e instanceof Error ? e.message : "No pudimos leer el aviso. Cargalo a mano.");
    } finally {
      setLeyendo(false);
    }
  }

  if (resultado) {
    return (
      <>
        <Eyebrow>Aviso leído</Eyebrow>
        <Titulo as="h2" tamano="s" className="mt-1">
          Revisá y guardá
        </Titulo>
        <Bajada className="mt-1 mb-5">Completé lo que encontré en el aviso. Corregí lo que haga falta.</Bajada>
        <FormPropiedad
          inicial={resultado.borrador}
          dudas={resultado.dudas}
          source="pasted"
          onGuardada={(p) => onGuardada(p.id)}
          onCancelar={() => setResultado(null)}
        />
      </>
    );
  }

  return (
    <>
      <Titulo as="h2" tamano="s">
        Pegá el aviso y lo ordeno
      </Titulo>
      <Bajada className="mt-1 mb-5">Copiá el texto del aviso del portal. Después revisás todo antes de guardar.</Bajada>
      <label htmlFor="aviso" className="mb-1 block text-[14px] leading-5 font-semibold text-tinta">
        Texto del aviso
      </label>
      <textarea
        id="aviso"
        rows={9}
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder={"Departamento en venta en Palermo Soho\nGorriti 4800 · USD 172.000 · Expensas $185.000\n3 ambientes · 72 m² · 4º piso con balcón"}
        className="block w-full resize-y rounded-md border border-linea-control bg-superficie px-4 py-3 text-cuerpo text-tinta placeholder:text-texto-suave"
      />
      <Campo
        className="mt-4"
        etiqueta="Link del aviso (opcional)"
        type="url"
        inputMode="url"
        autoCapitalize="none"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://www.zonaprop.com.ar/…"
        ayuda="No entro al link: solo lo guardo para que lo tengas a mano."
      />
      {error ? (
        <p role="alert" className="mt-3 flex items-start gap-1.5 text-cuerpo-s text-error">
          <CircleAlert size={18} strokeWidth={1.75} aria-hidden="true" className="mt-px shrink-0" />
          {error}
        </p>
      ) : null}
      <Button ancho="completo" className="mt-5" onClick={leer} disabled={leyendo}>
        {leyendo ? "Leyendo el aviso…" : "Leer aviso"}
      </Button>
    </>
  );
}

function Importar() {
  const sesion = useSession();
  const queryClient = useQueryClient();
  const input = useRef<HTMLInputElement>(null);
  const [archivo, setArchivo] = useState<string | null>(null);
  const [filas, setFilas] = useState<FilaImportada[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importando, setImportando] = useState(false);
  const [resultado, setResultado] = useState<{ creadas: number; repetidas: string[]; fallidas: string[] } | null>(null);

  async function elegir(f: File | undefined) {
    setError(null);
    setFilas(null);
    setResultado(null);
    if (!f) return;
    if (!/\.(csv|txt)$/i.test(f.name)) {
      setError("Subí un archivo .csv. Desde Excel: Archivo → Guardar como → CSV.");
      return;
    }
    if (f.size > 2 * 1024 * 1024) {
      setError("El archivo es muy grande. Probá con menos de 2 MB.");
      return;
    }
    setArchivo(f.name);
    const { filas: leidas, faltanColumnas } = filasAPropiedades(parsearCsv(await f.text()));
    if (faltanColumnas.length) {
      setError(`Faltan columnas: ${faltanColumnas.join(", ")}. Usá la plantilla.`);
      return;
    }
    if (!leidas.length) {
      setError("El archivo no tiene filas para importar.");
      return;
    }
    setFilas(leidas);
  }

  async function importar() {
    if (!filas) return;
    setImportando(true);
    const ds = getDataSource();
    const r = { creadas: 0, repetidas: [] as string[], fallidas: [] as string[] };
    for (const f of filas) {
      if (!f.ok) continue;
      try {
        await ds.properties.create(f.propiedad);
        r.creadas += 1;
      } catch (e) {
        if (e instanceof DataError && e.code === "duplicate") r.repetidas.push(f.propiedad.address);
        else r.fallidas.push(`Fila ${f.numero}`);
      }
    }
    await queryClient.invalidateQueries({ queryKey: [sesion?.agentId] });
    setResultado(r);
    setFilas(null);
    setArchivo(null);
    setImportando(false);
  }

  const validas = filas?.filter((f) => f.ok).length ?? 0;
  const conError = filas?.filter((f): f is Extract<FilaImportada, { ok: false }> => !f.ok) ?? [];

  if (resultado) {
    return (
      <>
        <Eyebrow>Importación lista</Eyebrow>
        <Titulo as="h2" tamano="s" className="mt-1">
          {resultado.creadas === 0
            ? "No había propiedades nuevas"
            : resultado.creadas === 1
              ? "Cargué 1 propiedad"
              : `Cargué ${resultado.creadas} propiedades`}
        </Titulo>
        {resultado.repetidas.length ? (
          <Bajada className="mt-2">
            No repetí {resultado.repetidas.length === 1 ? "una que ya tenías" : `${resultado.repetidas.length} que ya tenías`}:{" "}
            {resultado.repetidas.join(", ")}.
          </Bajada>
        ) : null}
        {resultado.fallidas.length ? <Bajada className="mt-2">No pude cargar: {resultado.fallidas.join(", ")}.</Bajada> : null}
        <ButtonLink href="/propiedades" ancho="completo" className="mt-6">
          Ver propiedades
        </ButtonLink>
        <Button variante="terciario" ancho="completo" className="mt-2" onClick={() => setResultado(null)}>
          Importar otro archivo
        </Button>
      </>
    );
  }

  return (
    <>
      <Titulo as="h2" tamano="s">
        Importá muchas de una vez
      </Titulo>
      <Bajada className="mt-1">
        Completá la plantilla en Excel o Google Sheets, guardala como CSV y subila. Las que ya tengas cargadas no se repiten.
      </Bajada>
      <a
        href="/plantillas/propiedades.csv"
        download="plantilla-propiedades-kairos.csv"
        className="mt-4 inline-flex min-h-11 items-center gap-2 text-boton text-acento underline underline-offset-2"
      >
        <Download size={20} strokeWidth={1.75} aria-hidden="true" />
        Bajar la plantilla
      </a>

      <input
        ref={input}
        type="file"
        accept=".csv,text/csv,.txt"
        className="sr-only"
        id="archivo-csv"
        onChange={(e) => void elegir(e.target.files?.[0])}
      />
      <Button
        variante="secundario"
        ancho="completo"
        className="mt-4"
        icono={<FileUp size={20} strokeWidth={1.75} aria-hidden="true" />}
        onClick={() => input.current?.click()}
      >
        {archivo ? `Elegir otro archivo (${archivo})` : "Elegir archivo CSV"}
      </Button>

      {error ? (
        <p role="alert" className="mt-3 flex items-start gap-1.5 text-cuerpo-s text-error">
          <CircleAlert size={18} strokeWidth={1.75} aria-hidden="true" className="mt-px shrink-0" />
          {error}
        </p>
      ) : null}

      {filas ? (
        <Card className="mt-5">
          <p className="flex items-center gap-1.5 text-cuerpo-s font-semibold text-exito">
            <Check size={18} strokeWidth={2} aria-hidden="true" />
            {validas === 1 ? "1 fila lista" : `${validas} filas listas`} para importar
          </p>
          {conError.length ? (
            <>
              <p className="mt-3 flex items-center gap-1.5 text-cuerpo-s font-semibold text-error">
                <CircleAlert size={18} strokeWidth={1.75} aria-hidden="true" />
                {conError.length === 1 ? "1 fila con errores" : `${conError.length} filas con errores`} (no se importan)
              </p>
              <ul className="mt-2 space-y-2">
                {conError.slice(0, 8).map((f) => (
                  <li key={f.numero} className="text-cuerpo-s text-texto">
                    <span className="font-semibold text-tinta">Fila {f.numero}:</span> {f.errores.join(" ")}
                  </li>
                ))}
                {conError.length > 8 ? <li className="text-pie text-texto-suave">Y {conError.length - 8} más.</li> : null}
              </ul>
            </>
          ) : null}
          <Button ancho="completo" className="mt-4" disabled={!validas || importando} onClick={importar}>
            {importando ? "Importando…" : validas === 1 ? "Importar 1 propiedad" : `Importar ${validas} propiedades`}
          </Button>
        </Card>
      ) : null}
    </>
  );
}
