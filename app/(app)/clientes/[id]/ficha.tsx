"use client";

import {
  ArrowLeft,
  Banknote,
  Building2,
  CalendarDays,
  Check,
  FileText,
  Landmark,
  MapPin,
  MessageCircle,
  Mic,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { use, useState, type ReactNode } from "react";
import { FotoPropiedad, direccionPropiedad } from "@/components/app/filas";
import { Cargando, Pantalla, Vacio } from "@/components/app/pantalla";
import { Avatar, PuntoLima } from "@/components/ui/avatar";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Chip, ChipBoton, ChipEditable } from "@/components/ui/chip";
import { Hoja } from "@/components/ui/hoja";
import type { BuyerCriteria, DiscardWithProperty, MatchWithRefs, Note } from "@/lib/data";
import {
  useAddDiscard,
  useBuyer,
  useBuyerCriteria,
  useBuyerDiscards,
  useBuyerMatches,
  useBuyerNotes,
  useProperties,
  useRemoveDiscard,
  useUpdateBuyer,
  useUpdateCriteria,
} from "@/lib/data/hooks";
import { ESTADO_CLIENTE, FINANCIACION, OPERACION, TIPO_PROPIEDAD, ambientesCorto, etiquetaCaracteristica } from "@/lib/domain/labels";
import { zonaPrincipal } from "@/lib/domain/resumen";
import { formatMonto, formatPorcentaje } from "@/lib/format";
import { formatTelefono, linkWhatsApp } from "@/lib/format/telefono";
import { antesDe, haceCuanto } from "@/lib/format/tiempo";
import {
  AgregarCaracteristica,
  AgregarDescarte,
  EditarContacto,
  EditarFinanciacion,
  EditarMudanza,
  EditarPresupuesto,
  EditarTipo,
  EditarZona,
} from "./editores";

type ListaChips = "must_haves" | "nice_to_haves" | "deal_breakers";
type Editor =
  | "tipo"
  | "zona"
  | "presupuesto"
  | "financiacion"
  | "mudanza"
  | "contacto"
  | "descarte"
  | { agregarA: ListaChips };

const TITULOS: Record<Exclude<Editor, { agregarA: ListaChips }>, string> = {
  tipo: "Qué tipo de propiedad busca",
  zona: "Dónde busca",
  presupuesto: "Hasta cuánto puede pagar",
  financiacion: "Cómo paga",
  mudanza: "Para cuándo",
  contacto: "Datos de contacto",
  descarte: "Agregar algo que descartó",
};

const LISTAS: Record<ListaChips, { titulo: string; agregar: string; vacio: string }> = {
  must_haves: { titulo: "Le importa", agregar: "Agregar algo que le importa", vacio: "Todavía no sabemos qué le importa." },
  nice_to_haves: { titulo: "Le gustaría", agregar: "Agregar algo que le gustaría", vacio: "Nada extra por ahora." },
  deal_breakers: { titulo: "No quiere", agregar: "Agregar algo que no quiere", vacio: "No dijo nada que no quiera." },
};

const primerNombre = (nombre: string) => nombre.split(" ")[0];

const duracion = (seg: number) => `${Math.floor(seg / 60)}:${String(seg % 60).padStart(2, "0")}`;

export function FichaCliente({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const cliente = useBuyer(id);
  const ficha = useBuyerCriteria(id);
  const notas = useBuyerNotes(id);
  const descartes = useBuyerDiscards(id);
  const oportunidades = useBuyerMatches(id);
  const propiedades = useProperties();

  const actualizarFicha = useUpdateCriteria(cliente.data);
  const actualizarCliente = useUpdateBuyer(id);
  const agregarDescarte = useAddDiscard(id);
  const quitarDescarte = useRemoveDiscard();

  const [editor, setEditor] = useState<Editor | null>(null);
  const [editandoLista, setEditandoLista] = useState<ListaChips | null>(null);
  const cerrar = () => setEditor(null);

  if (cliente.isPending || ficha.isPending) {
    return (
      <Pantalla>
        <Cargando filas={5} />
      </Pantalla>
    );
  }

  const c = cliente.data;
  const f = ficha.data;
  if (!c || !f) {
    return (
      <Pantalla>
        <Volver />
        <div className="mt-8">
          <Vacio titulo="No encontramos este cliente">Puede que se haya borrado o que sea de otra cuenta.</Vacio>
        </div>
      </Pantalla>
    );
  }

  const nombre = primerNombre(c.name);
  const guardarFicha = (cambios: Partial<Omit<BuyerCriteria, "buyer_id" | "agent_id">>) =>
    actualizarFicha.mutateAsync(cambios);

  function quitarDeLista(lista: ListaChips, clave: string) {
    void actualizarFicha.mutateAsync({ [lista]: f![lista].filter((x) => x !== clave) });
  }

  const ultimaNota = notas.data?.[0];
  const tituloHoja = typeof editor === "object" && editor ? LISTAS[editor.agregarA].agregar : editor ? TITULOS[editor] : "";

  return (
    <Pantalla
      accion={
        <div className="space-y-3">
          <div className="flex items-center gap-3 rounded-lg bg-noche px-4 py-3 text-[13px] leading-[18px] text-papel">
            <PuntoLima className="shrink-0" />
            <span>Buscando propiedades para {nombre}…</span>
          </div>
          <ButtonLink
            href={`/nota?cliente=${c.id}`}
            ancho="completo"
            icono={<Mic size={20} strokeWidth={1.75} aria-hidden="true" />}
          >
            Nueva nota
          </ButtonLink>
        </div>
      }
    >
      <header className="-mx-2 flex items-center gap-2">
        <Volver />
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <Avatar nombre={c.name} tamano="sm" />
          <h1 className="truncate text-[17px] leading-[22px] font-semibold text-tinta">{c.name}</h1>
        </div>
        {c.phone ? (
          <a
            href={linkWhatsApp(c.phone)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Escribirle a ${nombre} por WhatsApp`}
            className="flex size-11 shrink-0 items-center justify-center rounded-full border border-linea bg-superficie text-acento"
          >
            <MessageCircle size={20} strokeWidth={1.75} aria-hidden="true" />
          </a>
        ) : null}
      </header>

      <div className="mt-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          {ultimaNota ? (
            <Chip icono={<Mic size={14} strokeWidth={2} aria-hidden="true" />}>
              {ultimaNota.kind === "audio" ? "Desde tu audio" : "Desde tu nota"} · {haceCuanto(ultimaNota.created_at)}
            </Chip>
          ) : null}
          {c.status !== "active" ? <Chip variante="descarte">{ESTADO_CLIENTE[c.status]}</Chip> : null}
        </div>

        <Resumen texto={c.summary} zona={zonaPrincipal(f)} />

        {/* Qué busca */}
        <Card>
          <h2 className="mb-1 text-[17px] leading-[22px] font-semibold text-tinta">Qué busca</h2>
          <Fila
            icono={<Building2 size={18} strokeWidth={1.75} aria-hidden="true" />}
            etiqueta="Tipo"
            onEditar={() => setEditor("tipo")}
          >
            {[
              f.operation === "rent" ? OPERACION.rent : null,
              f.property_type ? TIPO_PROPIEDAD[f.property_type] : null,
              ambientesTexto(f),
            ]
              .filter(Boolean)
              .join(" · ") || <SinDato />}
          </Fila>
          <Fila
            icono={<MapPin size={18} strokeWidth={1.75} aria-hidden="true" />}
            etiqueta="Zona"
            onEditar={() => setEditor("zona")}
            abajo={
              f.subzones.length ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {f.subzones.map((s) => (
                    <Chip key={s}>{s}</Chip>
                  ))}
                </div>
              ) : null
            }
          >
            {f.neighborhood ?? (f.subzones.length ? null : <SinDato />)}
          </Fila>
          <Fila
            icono={<Banknote size={18} strokeWidth={1.75} aria-hidden="true" />}
            etiqueta="Presupuesto"
            onEditar={() => setEditor("presupuesto")}
          >
            {f.budget_max ? (
              <>
                Hasta {formatMonto(f.budget_max, f.currency)}
                {f.budget_tolerance_pct ? (
                  <span className="block text-[13px] leading-[18px] text-texto-suave">
                    Le avisamos hasta un {f.budget_tolerance_pct} % arriba
                  </span>
                ) : null}
              </>
            ) : (
              <SinDato />
            )}
          </Fila>
          <Fila
            icono={<Landmark size={18} strokeWidth={1.75} aria-hidden="true" />}
            etiqueta="Financiación"
            onEditar={() => setEditor("financiacion")}
          >
            {FINANCIACION[f.financing]}
          </Fila>
          <Fila
            icono={<CalendarDays size={18} strokeWidth={1.75} aria-hidden="true" />}
            etiqueta="Mudanza"
            onEditar={() => setEditor("mudanza")}
          >
            {f.move_by ? antesDe(f.move_by) : "Sin fecha"}
          </Fila>
        </Card>

        {/* Le importa · Le gustaría · No quiere */}
        {(Object.keys(LISTAS) as ListaChips[]).map((lista) => (
          <TarjetaChips
            key={lista}
            lista={lista}
            claves={f[lista]}
            editando={editandoLista === lista}
            onEditar={() => setEditandoLista(editandoLista === lista ? null : lista)}
            onQuitar={(clave) => quitarDeLista(lista, clave)}
            onAgregar={() => setEditor({ agregarA: lista })}
          />
        ))}

        {/* Ya descartó */}
        <Card>
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-[17px] leading-[22px] font-semibold text-tinta">Ya descartó</h2>
            <Button
              variante="terciario"
              tamano="sm"
              className="-mr-3"
              icono={<Plus size={20} strokeWidth={1.75} aria-hidden="true" />}
              onClick={() => setEditor("descarte")}
            >
              Agregar
            </Button>
          </div>
          {descartes.data?.length ? (
            <ul className="divide-y divide-linea">
              {descartes.data.map((d) => (
                <FilaDescarte key={d.id} descarte={d} onQuitar={() => quitarDescarte.mutate(d.id)} />
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-cuerpo-s text-texto-suave">Todavía no descartó nada.</p>
          )}
        </Card>

        {/* Oportunidades */}
        <Card>
          <h2 className="text-[17px] leading-[22px] font-semibold text-tinta">Oportunidades</h2>
          {oportunidades.data?.length ? (
            <ul className="divide-y divide-linea">
              {oportunidades.data.map((m) => (
                <FilaOportunidad key={m.id} oportunidad={m} />
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-cuerpo-s text-texto-suave">
              Todavía ninguna. Cuando entre una propiedad que le sirva, te avisamos.
            </p>
          )}
        </Card>

        {/* Historial */}
        <Card>
          <h2 className="text-[17px] leading-[22px] font-semibold text-tinta">Historial de notas</h2>
          {notas.data?.length ? (
            <ul className="divide-y divide-linea">
              {notas.data.map((n) => (
                <FilaNota key={n.id} nota={n} />
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-cuerpo-s text-texto-suave">Grabá una nota para empezar su historial.</p>
          )}
        </Card>

        {/* Contacto */}
        <Card>
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-[17px] leading-[22px] font-semibold text-tinta">Contacto</h2>
            <BotonLapiz etiqueta="Editar datos de contacto" onClick={() => setEditor("contacto")} />
          </div>
          <dl className="mt-1 space-y-2 text-cuerpo-s">
            <div>
              <dt className="text-pie text-texto-suave">WhatsApp</dt>
              <dd className="text-tinta">{c.phone ? formatTelefono(c.phone) : <SinDato />}</dd>
            </div>
            <div>
              <dt className="text-pie text-texto-suave">Email</dt>
              <dd className="break-all text-tinta">{c.email ?? <SinDato />}</dd>
            </div>
            <div>
              <dt className="text-pie text-texto-suave">Último contacto</dt>
              <dd className="text-tinta">{c.last_contact_at ? haceCuanto(c.last_contact_at) : "Sin contacto todavía"}</dd>
            </div>
          </dl>
        </Card>
      </div>

      <Hoja abierta={editor !== null} onCerrar={cerrar} titulo={tituloHoja}>
        {editor === "tipo" ? <EditarTipo ficha={f} guardar={guardarFicha} onCerrar={cerrar} /> : null}
        {editor === "zona" ? <EditarZona ficha={f} guardar={guardarFicha} onCerrar={cerrar} /> : null}
        {editor === "presupuesto" ? <EditarPresupuesto ficha={f} guardar={guardarFicha} onCerrar={cerrar} /> : null}
        {editor === "financiacion" ? <EditarFinanciacion ficha={f} guardar={guardarFicha} onCerrar={cerrar} /> : null}
        {editor === "mudanza" ? <EditarMudanza ficha={f} guardar={guardarFicha} onCerrar={cerrar} /> : null}
        {editor === "contacto" ? (
          <EditarContacto cliente={c} guardar={(cambios) => actualizarCliente.mutateAsync(cambios)} onCerrar={cerrar} />
        ) : null}
        {editor === "descarte" ? (
          <AgregarDescarte
            propiedades={propiedades.data ?? []}
            yaDescartadas={(descartes.data ?? []).map((d) => d.property_id).filter((x): x is string => Boolean(x))}
            onAgregar={(datos) => agregarDescarte.mutateAsync(datos)}
            onCerrar={cerrar}
          />
        ) : null}
        {typeof editor === "object" && editor ? (
          <AgregarCaracteristica
            actuales={[...f.must_haves, ...f.nice_to_haves, ...f.deal_breakers]}
            onAgregar={(clave) => guardarFicha({ [editor.agregarA]: [...f[editor.agregarA], clave] })}
            onCerrar={cerrar}
          />
        ) : null}
      </Hoja>
    </Pantalla>
  );
}

// --- Piezas -------------------------------------------------------------------

function Volver() {
  return (
    <Link
      href="/clientes"
      aria-label="Volver a clientes"
      className="flex size-11 shrink-0 items-center justify-center rounded-full text-tinta hover:bg-superficie-tinte"
    >
      <ArrowLeft size={24} strokeWidth={1.75} aria-hidden="true" />
    </Link>
  );
}

function SinDato() {
  return <span className="text-texto-suave">Sin cargar</span>;
}

function ambientesTexto(f: BuyerCriteria): string | null {
  const { rooms_min: a, rooms_max: b } = f;
  if (a && b && a !== b) return `${a} a ${b} ambientes`;
  const n = a ?? b;
  return n ? `${n} ${n === 1 ? "ambiente" : "ambientes"}` : null;
}

/** La frase resumen en Fraunces, con la zona como única palabra en acento. */
function Resumen({ texto, zona }: { texto: string | null; zona: string | null }) {
  if (!texto) {
    return (
      <p className="text-titulo-s text-tinta">
        Todavía no sabemos qué busca. Contale a Kairos en una nota.
      </p>
    );
  }
  const i = zona ? texto.indexOf(zona) : -1;
  return (
    <p className="text-titulo-s text-tinta text-balance">
      {i < 0 ? (
        texto
      ) : (
        <>
          {texto.slice(0, i)}
          <span className="text-acento">{zona}</span>
          {texto.slice(i + zona!.length)}
        </>
      )}
    </p>
  );
}

function BotonLapiz({ etiqueta, onClick }: { etiqueta: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={etiqueta}
      className="-mr-2 flex size-11 shrink-0 items-center justify-center rounded-full text-texto-suave hover:bg-superficie-tinte hover:text-acento"
    >
      <Pencil size={18} strokeWidth={1.75} aria-hidden="true" />
    </button>
  );
}

function Fila({
  icono,
  etiqueta,
  onEditar,
  abajo,
  children,
}: {
  icono: ReactNode;
  etiqueta: string;
  onEditar: () => void;
  abajo?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex gap-3 border-t border-linea py-3 first-of-type:border-t-0">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-[10px] bg-superficie-tinte text-acento">
        {icono}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] leading-[18px] font-medium text-texto-suave">{etiqueta}</p>
        <div className="text-[15px] leading-[21px] font-medium text-tinta">{children}</div>
        {abajo}
      </div>
      <BotonLapiz etiqueta={`Editar ${etiqueta.toLowerCase()}`} onClick={onEditar} />
    </div>
  );
}

function TarjetaChips({
  lista,
  claves,
  editando,
  onEditar,
  onQuitar,
  onAgregar,
}: {
  lista: ListaChips;
  claves: string[];
  editando: boolean;
  onEditar: () => void;
  onQuitar: (clave: string) => void;
  onAgregar: () => void;
}) {
  const { titulo, vacio } = LISTAS[lista];
  const negativo = lista === "deal_breakers";
  const variante = lista === "must_haves" ? "exito" : negativo ? "error" : "busca";
  const Icono = negativo ? X : Check;

  return (
    <Card>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[17px] leading-[22px] font-semibold text-tinta">{titulo}</h2>
        <Button variante="terciario" tamano="sm" className="-mr-3" onClick={onEditar} aria-label={`${editando ? "Terminar de editar" : "Editar"} ${titulo.toLowerCase()}`}>
          {editando ? "Listo" : "Editar"}
        </Button>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {claves.length === 0 && !editando ? <p className="text-cuerpo-s text-texto-suave">{vacio}</p> : null}
        {claves.map((clave) =>
          editando ? (
            <ChipEditable key={clave} variante={variante} onQuitar={() => onQuitar(clave)}>
              {etiquetaCaracteristica(clave)}
            </ChipEditable>
          ) : (
            <Chip key={clave} variante={variante} icono={<Icono size={14} strokeWidth={2.25} aria-hidden="true" />}>
              {etiquetaCaracteristica(clave)}
            </Chip>
          ),
        )}
        {editando ? (
          <ChipBoton icono={<Plus size={16} strokeWidth={2} aria-hidden="true" />} onClick={onAgregar}>
            Agregar
          </ChipBoton>
        ) : null}
      </div>
    </Card>
  );
}

function FilaDescarte({ descarte, onQuitar }: { descarte: DiscardWithProperty; onQuitar: () => void }) {
  const p = descarte.property;
  const titulo = p
    ? `${p.address} · ${p.floor === 0 ? "PB" : ambientesCorto(p.property_type, p.rooms)}`
    : (descarte.property_text ?? "Propiedad");
  return (
    <li className="flex items-center gap-3 py-3 last:pb-0">
      {p ? (
        <FotoPropiedad propiedad={p} className="size-14 rounded-md" sizes="56px" />
      ) : (
        <span className="flex size-14 shrink-0 items-center justify-center rounded-md bg-superficie-tinte text-texto-suave">
          <Building2 size={20} strokeWidth={1.75} aria-hidden="true" />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-[15px] leading-[21px] font-semibold text-tinta">{titulo}</p>
        <p className="mt-0.5 text-[13px] leading-[18px] text-texto-suave">“{descarte.reason}”</p>
      </div>
      <button
        type="button"
        onClick={onQuitar}
        aria-label={`Quitar el descarte de ${titulo}`}
        className="-mr-2 flex size-11 shrink-0 items-center justify-center rounded-full text-texto-suave hover:bg-superficie-tinte hover:text-error"
      >
        <Trash2 size={18} strokeWidth={1.75} aria-hidden="true" />
      </button>
    </li>
  );
}

function FilaOportunidad({ oportunidad: m }: { oportunidad: MatchWithRefs }) {
  return (
    <li className="flex items-center gap-3 py-3 last:pb-0">
      <FotoPropiedad propiedad={m.property} className="size-14 rounded-md" sizes="56px" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] leading-[21px] font-semibold text-tinta">{direccionPropiedad(m.property)}</p>
        <p className="text-[13px] leading-[18px] text-texto">{formatMonto(m.property.price, m.property.currency)}</p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          <Chip>{formatPorcentaje(m.score)} encaje</Chip>
          {m.status === "sent" ? (
            <Chip variante="exito" icono={<Check size={14} strokeWidth={2.25} aria-hidden="true" />}>
              Enviado
            </Chip>
          ) : m.status === "new" ? (
            <Chip variante="oportunidad">Nueva</Chip>
          ) : null}
        </div>
      </div>
    </li>
  );
}

function FilaNota({ nota }: { nota: Note }) {
  return (
    <li className="py-3 last:pb-0">
      <p className="flex items-center gap-1.5 text-pie text-texto-suave">
        {nota.kind === "audio" ? (
          <Mic size={14} strokeWidth={2} aria-hidden="true" />
        ) : (
          <FileText size={14} strokeWidth={2} aria-hidden="true" />
        )}
        {nota.kind === "audio" ? "Audio" : "Nota escrita"}
        {nota.duration_seconds ? ` · ${duracion(nota.duration_seconds)}` : ""} · {haceCuanto(nota.created_at)}
      </p>
      {nota.audio_path ? (
        <audio controls preload="none" src={nota.audio_path} className="mt-2 w-full">
          Tu navegador no puede reproducir este audio.
        </audio>
      ) : nota.kind === "audio" ? (
        <p className="mt-1 text-pie text-texto-suave">El audio se borró después de transcribirlo.</p>
      ) : null}
      {nota.transcript ? (
        <blockquote className="mt-2 rounded-md bg-chip px-3 py-2 text-cuerpo-s text-tinta">{nota.transcript}</blockquote>
      ) : null}
      {nota.changes.length ? (
        <ul className="mt-2 space-y-1">
          {nota.changes.map((cambio) => (
            <li key={cambio} className="flex items-start gap-1.5 text-cuerpo-s text-texto">
              <Check size={16} strokeWidth={2} aria-hidden="true" className="mt-0.5 shrink-0 text-exito" />
              {cambio}
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  );
}
