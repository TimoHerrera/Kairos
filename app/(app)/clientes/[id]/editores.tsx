"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Campo } from "@/components/ui/campo";
import { ChipBoton, ChipEditable } from "@/components/ui/chip";
import { HojaAcciones } from "@/components/ui/hoja";
import { Selector } from "@/components/ui/selector";
import {
  DataError,
  type Buyer,
  type BuyerCriteria,
  type BuyerStatus,
  type Currency,
  type Financing,
  type Operation,
  type Property,
  type PropertyType,
} from "@/lib/data";
import { direccionPropiedad } from "@/components/app/filas";
import { CARACTERISTICAS, ESTADO_CLIENTE, FINANCIACION, OPERACION, TIPO_PROPIEDAD } from "@/lib/domain/labels";
import { formatNumero } from "@/lib/format";
import { normalizarTelefono } from "@/lib/format/telefono";

type CambiosFicha = Partial<Omit<BuyerCriteria, "buyer_id" | "agent_id">>;
type Guardar = (cambios: CambiosFicha) => Promise<unknown>;

const opciones = <T extends string>(mapa: Record<T, string>) =>
  (Object.keys(mapa) as T[]).map((valor) => ({ valor, texto: mapa[valor] }));

/** "180.000" o "180000" → 180000. Vacío → null. NaN si no es un número. */
function leerNumero(texto: string): number | null {
  const limpio = texto.replace(/[.\s]/g, "").replace(",", ".");
  if (!limpio) return null;
  return Number(limpio);
}

function Formulario({
  onSubmit,
  onCerrar,
  guardando,
  error,
  children,
}: {
  onSubmit: () => void;
  onCerrar: () => void;
  guardando: boolean;
  error?: string | null;
  children: ReactNode;
}) {
  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={(e: FormEvent) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      {children}
      {error ? (
        <p role="alert" className="text-cuerpo-s text-error">
          {error}
        </p>
      ) : null}
      <HojaAcciones>
        <Button type="submit" ancho="completo" disabled={guardando}>
          {guardando ? "Guardando…" : "Guardar"}
        </Button>
        <Button variante="terciario" ancho="completo" onClick={onCerrar}>
          Cancelar
        </Button>
      </HojaAcciones>
    </form>
  );
}

/** Estado común de los editores: guarda, cierra si salió bien y muestra el error si no. */
function useGuardar(onCerrar: () => void) {
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function correr(accion: () => Promise<unknown>) {
    setError(null);
    setGuardando(true);
    try {
      await accion();
      onCerrar();
    } catch (err) {
      setError(err instanceof DataError ? err.message : "No pudimos guardar. Probá de nuevo.");
      setGuardando(false);
    }
  }
  return { guardando, error, setError, correr };
}

// --- Qué busca ----------------------------------------------------------------

export function EditarTipo({ ficha, guardar, onCerrar }: { ficha: BuyerCriteria; guardar: Guardar; onCerrar: () => void }) {
  const [operacion, setOperacion] = useState<Operation>(ficha.operation);
  const [tipo, setTipo] = useState<PropertyType | "">(ficha.property_type ?? "");
  const [min, setMin] = useState(ficha.rooms_min?.toString() ?? "");
  const [max, setMax] = useState(ficha.rooms_max?.toString() ?? "");
  const g = useGuardar(onCerrar);

  function enviar() {
    const a = leerNumero(min);
    const b = leerNumero(max);
    if ([a, b].some((n) => n !== null && (!Number.isInteger(n) || n < 1 || n > 20))) {
      return g.setError("Los ambientes van en números enteros, por ejemplo 3.");
    }
    if (a !== null && b !== null && a > b) return g.setError("El mínimo de ambientes no puede ser mayor que el máximo.");
    g.correr(() =>
      guardar({ operation: operacion, property_type: tipo || null, rooms_min: a ?? b, rooms_max: b ?? a }),
    );
  }

  return (
    <Formulario onSubmit={enviar} onCerrar={onCerrar} guardando={g.guardando} error={g.error}>
      <Selector
        etiqueta="Operación"
        value={operacion}
        onChange={(e) => setOperacion(e.target.value as Operation)}
        opciones={opciones(OPERACION)}
      />
      <Selector
        etiqueta="Tipo de propiedad"
        value={tipo}
        onChange={(e) => setTipo(e.target.value as PropertyType | "")}
        opciones={[{ valor: "", texto: "Sin definir" }, ...opciones(TIPO_PROPIEDAD)]}
      />
      <div className="grid grid-cols-2 gap-3">
        <Campo etiqueta="Ambientes, desde" inputMode="numeric" value={min} onChange={(e) => setMin(e.target.value)} />
        <Campo etiqueta="Hasta" inputMode="numeric" value={max} onChange={(e) => setMax(e.target.value)} />
      </div>
    </Formulario>
  );
}

export function EditarZona({ ficha, guardar, onCerrar }: { ficha: BuyerCriteria; guardar: Guardar; onCerrar: () => void }) {
  const [barrio, setBarrio] = useState(ficha.neighborhood ?? "");
  const [subzonas, setSubzonas] = useState(ficha.subzones);
  const [nueva, setNueva] = useState("");
  const g = useGuardar(onCerrar);

  function sumar() {
    const s = nueva.trim();
    if (s && !subzonas.some((x) => x.toLowerCase() === s.toLowerCase())) setSubzonas([...subzonas, s]);
    setNueva("");
  }

  function enviar() {
    // Si quedó una subzona escrita sin tocar "Agregar", también cuenta.
    const pendiente = nueva.trim();
    const todas =
      pendiente && !subzonas.some((x) => x.toLowerCase() === pendiente.toLowerCase()) ? [...subzonas, pendiente] : subzonas;
    g.correr(() => guardar({ neighborhood: barrio.trim() || null, subzones: todas }));
  }

  return (
    <Formulario onSubmit={enviar} onCerrar={onCerrar} guardando={g.guardando} error={g.error}>
      <Campo etiqueta="Barrio" value={barrio} onChange={(e) => setBarrio(e.target.value)} placeholder="Palermo" autoCapitalize="words" />
      <div>
        <p className="mb-2 text-[14px] leading-5 font-semibold text-tinta">Subzonas</p>
        {subzonas.length ? (
          <div className="mb-3 flex flex-wrap gap-2">
            {subzonas.map((s) => (
              <ChipEditable key={s} onQuitar={() => setSubzonas(subzonas.filter((x) => x !== s))}>
                {s}
              </ChipEditable>
            ))}
          </div>
        ) : null}
        <div className="flex items-end gap-2">
          <Campo
            className="flex-1"
            etiqueta="Agregar subzona"
            value={nueva}
            onChange={(e) => setNueva(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                sumar();
              }
            }}
            placeholder="Soho"
            autoCapitalize="words"
          />
          <Button variante="secundario" onClick={sumar}>
            Agregar
          </Button>
        </div>
      </div>
    </Formulario>
  );
}

export function EditarPresupuesto({ ficha, guardar, onCerrar }: { ficha: BuyerCriteria; guardar: Guardar; onCerrar: () => void }) {
  const [moneda, setMoneda] = useState<Currency>(ficha.currency);
  const [tope, setTope] = useState(ficha.budget_max ? formatNumero(ficha.budget_max) : "");
  const [tolerancia, setTolerancia] = useState(ficha.budget_tolerance_pct ? String(ficha.budget_tolerance_pct) : "");
  const g = useGuardar(onCerrar);

  function enviar() {
    const t = leerNumero(tope);
    const tol = leerNumero(tolerancia) ?? 0;
    if (t !== null && (!Number.isFinite(t) || t <= 0)) return g.setError("El tope va en números, por ejemplo 180.000.");
    if (!Number.isFinite(tol) || tol < 0 || tol > 50) return g.setError("La tolerancia va de 0 a 50 %.");
    g.correr(() => guardar({ currency: moneda, budget_max: t, budget_tolerance_pct: tol }));
  }

  return (
    <Formulario onSubmit={enviar} onCerrar={onCerrar} guardando={g.guardando} error={g.error}>
      <div className="grid grid-cols-[120px_1fr] gap-3">
        <Selector
          etiqueta="Moneda"
          value={moneda}
          onChange={(e) => setMoneda(e.target.value as Currency)}
          opciones={[
            { valor: "USD", texto: "USD" },
            { valor: "ARS", texto: "Pesos" },
          ]}
        />
        <Campo etiqueta="Tope" inputMode="numeric" value={tope} onChange={(e) => setTope(e.target.value)} placeholder="180.000" />
      </div>
      <Campo
        etiqueta="Tolerancia sobre el tope, en % (opcional)"
        inputMode="decimal"
        value={tolerancia}
        onChange={(e) => setTolerancia(e.target.value)}
        placeholder="0"
        ayuda="Con 5 %, también le avisamos de propiedades hasta un 5 % arriba de su tope."
      />
    </Formulario>
  );
}

export function EditarFinanciacion({ ficha, guardar, onCerrar }: { ficha: BuyerCriteria; guardar: Guardar; onCerrar: () => void }) {
  const [valor, setValor] = useState<Financing>(ficha.financing);
  const g = useGuardar(onCerrar);
  return (
    <Formulario onSubmit={() => g.correr(() => guardar({ financing: valor }))} onCerrar={onCerrar} guardando={g.guardando} error={g.error}>
      <Selector
        etiqueta="Cómo paga"
        value={valor}
        onChange={(e) => setValor(e.target.value as Financing)}
        opciones={opciones(FINANCIACION)}
      />
    </Formulario>
  );
}

export function EditarMudanza({ ficha, guardar, onCerrar }: { ficha: BuyerCriteria; guardar: Guardar; onCerrar: () => void }) {
  const [mes, setMes] = useState(ficha.move_by?.slice(0, 7) ?? "");
  const g = useGuardar(onCerrar);

  function enviar() {
    if (mes && !/^\d{4}-(0[1-9]|1[0-2])$/.test(mes)) return g.setError("Elegí mes y año, por ejemplo marzo de 2027.");
    g.correr(() => guardar({ move_by: mes ? `${mes}-01` : null }));
  }

  return (
    <Formulario onSubmit={enviar} onCerrar={onCerrar} guardando={g.guardando} error={g.error}>
      <Campo
        etiqueta="Quiere mudarse antes de"
        type="month"
        value={mes}
        onChange={(e) => setMes(e.target.value)}
        ayuda="Dejalo vacío si no tiene fecha."
      />
      {mes ? (
        <Button variante="terciario" tamano="sm" className="-ml-4" onClick={() => setMes("")}>
          Sacar la fecha
        </Button>
      ) : null}
    </Formulario>
  );
}

// --- Chips: le importa, le gustaría, no quiere ---------------------------------

export function AgregarCaracteristica({
  actuales,
  onAgregar,
  onCerrar,
}: {
  actuales: string[];
  onAgregar: (clave: string) => Promise<unknown>;
  onCerrar: () => void;
}) {
  const [texto, setTexto] = useState("");
  const g = useGuardar(onCerrar);
  const sugeridas = Object.entries(CARACTERISTICAS).filter(([clave]) => !actuales.includes(clave));

  function enviar() {
    const t = texto.trim();
    if (!t) return g.setError("Elegí una de la lista o escribí otra.");
    // Si escribió algo que ya conocemos ("balcón"), se guarda con su clave.
    const conocida = Object.entries(CARACTERISTICAS).find(([, etiqueta]) => etiqueta.toLowerCase() === t.toLowerCase());
    const clave = conocida?.[0] ?? t;
    if (actuales.some((a) => a.toLowerCase() === clave.toLowerCase())) return g.setError("Esa ya está en la ficha.");
    g.correr(() => onAgregar(clave));
  }

  return (
    <Formulario onSubmit={enviar} onCerrar={onCerrar} guardando={g.guardando} error={g.error}>
      {sugeridas.length ? (
        <div className="flex flex-wrap gap-2">
          {sugeridas.map(([clave, etiqueta]) => (
            <ChipBoton key={clave} onClick={() => g.correr(() => onAgregar(clave))}>
              {etiqueta}
            </ChipBoton>
          ))}
        </div>
      ) : null}
      <Campo etiqueta="Otra, con sus palabras" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Cerca del subte" />
    </Formulario>
  );
}

// --- Descartes ----------------------------------------------------------------

export function AgregarDescarte({
  propiedades,
  yaDescartadas,
  onAgregar,
  onCerrar,
}: {
  propiedades: Property[];
  yaDescartadas: string[];
  onAgregar: (datos: { property_id?: string | null; property_text?: string | null; reason: string }) => Promise<unknown>;
  onCerrar: () => void;
}) {
  const disponibles = propiedades.filter((p) => !yaDescartadas.includes(p.id));
  const [propiedadId, setPropiedadId] = useState("");
  const [texto, setTexto] = useState("");
  const [motivo, setMotivo] = useState("");
  const g = useGuardar(onCerrar);

  function enviar() {
    if (!propiedadId && !texto.trim()) return g.setError("Elegí la propiedad o escribí cuál fue.");
    if (!motivo.trim()) return g.setError("Contá por qué la descartó, con sus palabras.");
    g.correr(() =>
      onAgregar({ property_id: propiedadId || null, property_text: propiedadId ? null : texto, reason: motivo }),
    );
  }

  return (
    <Formulario onSubmit={enviar} onCerrar={onCerrar} guardando={g.guardando} error={g.error}>
      {disponibles.length ? (
        <Selector
          etiqueta="Propiedad"
          value={propiedadId}
          onChange={(e) => setPropiedadId(e.target.value)}
          opciones={[
            { valor: "", texto: "Otra que no está cargada" },
            ...disponibles.map((p) => ({ valor: p.id, texto: direccionPropiedad(p) })),
          ]}
        />
      ) : null}
      {!propiedadId ? (
        <Campo etiqueta="Cuál fue" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="El 3 amb de Av. Santa Fe 3900" />
      ) : null}
      <Campo
        etiqueta="Por qué la descartó"
        value={motivo}
        onChange={(e) => setMotivo(e.target.value)}
        placeholder="Muy ruidosa, da a la avenida"
      />
    </Formulario>
  );
}

// --- Contacto -----------------------------------------------------------------

export function EditarContacto({
  cliente,
  guardar,
  onCerrar,
}: {
  cliente: Buyer;
  guardar: (cambios: { name: string; phone: string | null; email: string | null; status: BuyerStatus }) => Promise<unknown>;
  onCerrar: () => void;
}) {
  const [nombre, setNombre] = useState(cliente.name);
  const [telefono, setTelefono] = useState(cliente.phone ? cliente.phone.replace(/^549/, "") : "");
  const [email, setEmail] = useState(cliente.email ?? "");
  const [estado, setEstado] = useState<BuyerStatus>(cliente.status);
  const g = useGuardar(onCerrar);

  function enviar() {
    if (!nombre.trim()) return g.setError("El cliente necesita un nombre.");
    const tel = telefono.trim() ? normalizarTelefono(telefono) : null;
    if (telefono.trim() && !tel) return g.setError("Revisá el número: con código de área, por ejemplo 11 5555 0101.");
    g.correr(() => guardar({ name: nombre, phone: tel, email: email.trim() || null, status: estado }));
  }

  return (
    <Formulario onSubmit={enviar} onCerrar={onCerrar} guardando={g.guardando} error={g.error}>
      <Campo etiqueta="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} autoCapitalize="words" autoComplete="off" />
      <Campo
        etiqueta="WhatsApp"
        type="tel"
        inputMode="tel"
        value={telefono}
        onChange={(e) => setTelefono(e.target.value)}
        autoComplete="off"
        placeholder="11 5555 0101"
      />
      <Campo
        etiqueta="Email"
        type="email"
        inputMode="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
      />
      <Selector
        etiqueta="Estado"
        value={estado}
        onChange={(e) => setEstado(e.target.value as BuyerStatus)}
        opciones={opciones(ESTADO_CLIENTE)}
      />
    </Formulario>
  );
}
