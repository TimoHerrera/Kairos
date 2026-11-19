"use client";

import { ChevronRight, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { FilaPropiedad } from "@/components/app/filas";
import { Cargando, Pantalla, Vacio } from "@/components/app/pantalla";
import { Eyebrow, Titulo } from "@/components/ui/bloque";
import { ButtonLink } from "@/components/ui/button";
import { ChipBoton } from "@/components/ui/chip";
import type { Operation } from "@/lib/data";
import { useProperties } from "@/lib/data/hooks";

const plano = (t: string) =>
  t
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

export default function Propiedades() {
  const propiedades = useProperties();
  const [busqueda, setBusqueda] = useState("");
  const [operacion, setOperacion] = useState<Operation | "todas">("todas");
  const [barrio, setBarrio] = useState<string | null>(null);

  const todas = useMemo(() => propiedades.data ?? [], [propiedades.data]);

  // Los barrios con más propiedades primero.
  const barrios = useMemo(() => {
    const cuenta = new Map<string, number>();
    for (const p of todas) cuenta.set(p.neighborhood, (cuenta.get(p.neighborhood) ?? 0) + 1);
    return [...cuenta.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [todas]);
  const hayAlquileres = todas.some((p) => p.operation === "rent");

  const lista = useMemo(() => {
    const q = plano(busqueda.trim());
    return todas.filter(
      (p) =>
        (operacion === "todas" || p.operation === operacion) &&
        (!barrio || p.neighborhood === barrio) &&
        (!q || plano(`${p.address} ${p.neighborhood} ${p.subzone ?? ""}`).includes(q)),
    );
  }, [todas, busqueda, operacion, barrio]);

  const filtrando = busqueda.trim() !== "" || operacion !== "todas" || barrio !== null;

  return (
    <Pantalla>
      <div className="flex items-end justify-between gap-3">
        <div>
          <Eyebrow>Tu cartera</Eyebrow>
          <Titulo as="h1" className="mt-1">
            Propiedades
          </Titulo>
        </div>
        <ButtonLink href="/propiedades/nueva" tamano="sm" variante="secundario" icono={<Plus size={20} strokeWidth={1.75} aria-hidden="true" />}>
          Cargar
        </ButtonLink>
      </div>

      {propiedades.isPending ? (
        <div className="mt-5">
          <Cargando filas={4} />
        </div>
      ) : todas.length === 0 ? (
        <div className="mt-5">
          <Vacio titulo="Todavía no hay propiedades">
            Cargá una a mano, pegá un aviso o importá un CSV. Kairos te dice a qué clientes les sirve.
          </Vacio>
        </div>
      ) : (
        <>
          <div className="relative mt-4">
            <Search size={20} strokeWidth={1.75} aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-texto-suave" />
            <input
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por calle o barrio"
              aria-label="Buscar propiedades"
              className="block min-h-12 w-full rounded-md border border-linea-control bg-superficie pr-4 pl-11 text-cuerpo text-tinta placeholder:text-texto-suave"
            />
          </div>

          <div role="group" aria-label="Filtrar propiedades" className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 py-1 [scrollbar-width:none]">
            {hayAlquileres ? (
              <>
                <ChipBoton activo={operacion === "buy"} onClick={() => setOperacion(operacion === "buy" ? "todas" : "buy")}>
                  Venta
                </ChipBoton>
                <ChipBoton activo={operacion === "rent"} onClick={() => setOperacion(operacion === "rent" ? "todas" : "rent")}>
                  Alquiler
                </ChipBoton>
              </>
            ) : null}
            {barrios.map(([b, n]) => (
              <ChipBoton key={b} activo={barrio === b} onClick={() => setBarrio(barrio === b ? null : b)}>
                {b} · {n}
              </ChipBoton>
            ))}
          </div>

          <p className="mt-3 mb-2 text-pie text-texto-suave" role="status">
            {lista.length === 1 ? "1 propiedad" : `${lista.length} propiedades`}
            {filtrando ? " con ese filtro" : ""}
          </p>

          {lista.length === 0 ? (
            <Vacio titulo="Ninguna coincide">Probá con otra calle o sacá el filtro.</Vacio>
          ) : (
            <ul className="space-y-3">
              {lista.map((p) => (
                <li key={p.id}>
                  <Link href={`/propiedades/${p.id}`} className="flex items-center gap-2 rounded-lg border border-linea bg-superficie p-3 hover:bg-superficie-tinte">
                    <div className="min-w-0 flex-1">
                      <FilaPropiedad propiedad={p} />
                    </div>
                    <ChevronRight size={20} strokeWidth={1.75} aria-hidden="true" className="shrink-0 text-texto-suave" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </Pantalla>
  );
}
