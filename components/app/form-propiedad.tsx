"use client";

import { TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Campo } from "@/components/ui/campo";
import { Casilla } from "@/components/ui/casilla";
import { ChipBoton } from "@/components/ui/chip";
import { Selector } from "@/components/ui/selector";
import { DataError, type NewProperty, type Property } from "@/lib/data";
import { useCreateProperty } from "@/lib/data/hooks";
import { APTO_CREDITO, CARACTERISTICAS, OPERACION, TIPO_PROPIEDAD } from "@/lib/domain/labels";
import { borradorAPropiedad, type Borrador, type ErroresBorrador } from "@/lib/domain/propiedad";

const opciones = <T extends string>(mapa: Record<T, string>) =>
  (Object.keys(mapa) as T[]).map((valor) => ({ valor, texto: mapa[valor] }));

/** Lo que el aviso no aclaró, en palabras del agente. */
const DUDA: Record<string, string> = {
  direccion: "la dirección",
  barrio: "el barrio",
  precio: "el precio",
  ambientes: "los ambientes",
  piso: "el piso",
  apto_credito: "si es apto crédito",
  operacion: "si es venta o alquiler",
};

// Las que ya tienen su propio campo no van como amenity.
const AMENITIES = Object.entries(CARACTERISTICAS).filter(([c]) => !["balcon", "planta_baja", "sobre_avenida"].includes(c));

export function FormPropiedad({
  inicial,
  source,
  dudas = [],
  onGuardada,
  onCancelar,
}: {
  inicial: Borrador;
  source: NewProperty["source"];
  dudas?: string[];
  onGuardada: (p: Property) => void;
  onCancelar?: () => void;
}) {
  const [b, setB] = useState<Borrador>(inicial);
  const [errores, setErrores] = useState<ErroresBorrador>({});
  const [repetida, setRepetida] = useState<{ id: string; name: string } | null>(null);
  const [general, setGeneral] = useState<string | null>(null);
  const crear = useCreateProperty();

  const cambiar = <K extends keyof Borrador>(campo: K, valor: Borrador[K]) => setB((x) => ({ ...x, [campo]: valor }));
  const campo = (k: keyof Borrador) => ({
    value: b[k] as string,
    onChange: (e: { target: { value: string } }) => cambiar(k, e.target.value as never),
    error: errores[k],
  });

  async function guardar(e: FormEvent) {
    e.preventDefault();
    setRepetida(null);
    setGeneral(null);
    const r = borradorAPropiedad(b, source);
    if (!r.ok) {
      setErrores(r.errores);
      setGeneral("Revisá los campos marcados.");
      return;
    }
    setErrores({});
    try {
      onGuardada(await crear.mutateAsync(r.propiedad));
    } catch (err) {
      if (err instanceof DataError && err.code === "duplicate") {
        setRepetida(err.existing ?? null);
        setGeneral(err.message);
      } else {
        setGeneral(err instanceof DataError ? err.message : "No pudimos guardarla. Probá de nuevo.");
      }
    }
  }

  const pendientes = dudas.filter((d) => DUDA[d]);

  return (
    <form onSubmit={guardar} noValidate className="space-y-4">
      {pendientes.length ? (
        <div className="flex items-start gap-2 rounded-md bg-alerta-tinte px-3 py-2.5 text-cuerpo-s text-alerta" role="note">
          <TriangleAlert size={18} strokeWidth={1.75} aria-hidden="true" className="mt-px shrink-0" />
          <span>
            Revisá {pendientes.map((d) => DUDA[d]).join(", ").replace(/, ([^,]*)$/, " y $1")}: el aviso no lo dejaba claro.
          </span>
        </div>
      ) : null}

      <Campo etiqueta="Dirección" placeholder="Gorriti 4800" autoCapitalize="words" autoComplete="off" {...campo("address")} />
      <div className="grid grid-cols-2 gap-3">
        <Campo etiqueta="Barrio" placeholder="Palermo" autoCapitalize="words" autoComplete="off" {...campo("neighborhood")} />
        <Campo etiqueta="Subzona (opcional)" placeholder="Soho" autoCapitalize="words" autoComplete="off" {...campo("subzone")} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Selector etiqueta="Operación" value={b.operation} onChange={(e) => cambiar("operation", e.target.value as Borrador["operation"])} opciones={opciones(OPERACION)} />
        <Selector etiqueta="Tipo" value={b.property_type} onChange={(e) => cambiar("property_type", e.target.value as Borrador["property_type"])} opciones={opciones(TIPO_PROPIEDAD)} />
      </div>
      <div className="grid grid-cols-[110px_1fr] gap-3">
        <Selector
          etiqueta="Moneda"
          value={b.currency}
          onChange={(e) => cambiar("currency", e.target.value as Borrador["currency"])}
          opciones={[
            { valor: "USD", texto: "USD" },
            { valor: "ARS", texto: "Pesos" },
          ]}
        />
        <Campo etiqueta="Precio" inputMode="numeric" placeholder="172.000" {...campo("price")} />
      </div>
      <Campo etiqueta="Expensas en pesos (opcional)" inputMode="numeric" placeholder="185.000" {...campo("expenses")} />
      <div className="grid grid-cols-3 gap-3">
        <Campo etiqueta="Ambientes" inputMode="numeric" {...campo("rooms")} />
        <Campo etiqueta="Dormitorios" inputMode="numeric" {...campo("bedrooms")} />
        <Campo etiqueta="Piso" placeholder="4 o PB" {...campo("floor")} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Campo etiqueta="m² cubiertos" inputMode="decimal" {...campo("covered_m2")} />
        <Campo etiqueta="m² totales" inputMode="decimal" {...campo("total_m2")} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Campo etiqueta="Orientación" placeholder="Norte" autoCapitalize="words" {...campo("orientation")} />
        <Selector
          etiqueta="Apto crédito"
          value={b.credit_eligible}
          onChange={(e) => cambiar("credit_eligible", e.target.value as Borrador["credit_eligible"])}
          opciones={[
            { valor: "unconfirmed", texto: "A confirmar" },
            { valor: "yes", texto: "Sí" },
            { valor: "no", texto: "No" },
          ]}
          aria-description={APTO_CREDITO[b.credit_eligible]}
        />
      </div>
      <div>
        <Casilla checked={b.balcony} onChange={(v) => cambiar("balcony", v)}>
          Tiene balcón
        </Casilla>
        <Casilla checked={b.on_avenue} onChange={(v) => cambiar("on_avenue", v)} ayuda="Se marca sola si la dirección empieza con Av.">
          Da a una avenida
        </Casilla>
      </div>
      <div>
        <p className="mb-2 text-[14px] leading-5 font-semibold text-tinta">Características</p>
        <div className="flex flex-wrap gap-2">
          {AMENITIES.map(([clave, etiqueta]) => {
            const activo = b.amenities.includes(clave);
            return (
              <ChipBoton
                key={clave}
                activo={activo}
                onClick={() => cambiar("amenities", activo ? b.amenities.filter((a) => a !== clave) : [...b.amenities, clave])}
              >
                {etiqueta}
              </ChipBoton>
            );
          })}
        </div>
      </div>
      <Campo etiqueta="Link del aviso (opcional)" type="url" inputMode="url" autoCapitalize="none" placeholder="https://www.zonaprop.com.ar/…" {...campo("url")} />
      <div>
        <label htmlFor="descripcion" className="mb-1 block text-[14px] leading-5 font-semibold text-tinta">
          Descripción (opcional)
        </label>
        <textarea
          id="descripcion"
          rows={4}
          value={b.description}
          onChange={(e) => cambiar("description", e.target.value)}
          className="block w-full resize-y rounded-md border border-linea-control bg-superficie px-4 py-3 text-cuerpo text-tinta"
        />
      </div>

      {general ? (
        <div role="alert" className="text-cuerpo-s text-error">
          <p>{general}</p>
          {repetida ? (
            <Link href={`/propiedades/${repetida.id}`} className="mt-1 inline-flex min-h-11 items-center text-boton text-acento underline underline-offset-2">
              Ver {repetida.name}
            </Link>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-col gap-2 pt-2">
        <Button type="submit" ancho="completo" disabled={crear.isPending}>
          {crear.isPending ? "Guardando…" : "Guardar propiedad"}
        </Button>
        {onCancelar ? (
          <Button variante="terciario" ancho="completo" onClick={onCancelar}>
            Cancelar
          </Button>
        ) : null}
      </div>
    </form>
  );
}
