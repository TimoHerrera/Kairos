"use client";

import { ChevronRight, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { FilaCliente } from "@/components/app/filas";
import { Cargando, Pantalla, Vacio } from "@/components/app/pantalla";
import { Eyebrow, Titulo } from "@/components/ui/bloque";
import { Button } from "@/components/ui/button";
import { Chip, ChipBoton } from "@/components/ui/chip";
import type { BuyerStatus } from "@/lib/data";
import { useBuyers } from "@/lib/data/hooks";
import { ESTADO_CLIENTE } from "@/lib/domain/labels";
import { haceCuanto } from "@/lib/format/tiempo";
import { NuevoCliente } from "./nuevo-cliente";

const ESTADOS: BuyerStatus[] = ["active", "paused", "closed", "lost"];
const PLURAL: Record<BuyerStatus, string> = {
  active: "Activos",
  paused: "En pausa",
  closed: "Cerraron",
  lost: "Perdidos",
};

/** Compara sin tildes ni mayúsculas: "gomez" encuentra a "Gómez". */
const plano = (t: string) =>
  t
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

export default function Clientes() {
  const clientes = useBuyers();
  const [busqueda, setBusqueda] = useState("");
  const [estado, setEstado] = useState<BuyerStatus | "todos">("todos");
  const [creando, setCreando] = useState(false);

  const todos = useMemo(() => clientes.data ?? [], [clientes.data]);
  const cuenta = useMemo(() => {
    const c: Record<string, number> = {};
    for (const b of todos) c[b.status] = (c[b.status] ?? 0) + 1;
    return c;
  }, [todos]);

  const lista = useMemo(() => {
    const q = plano(busqueda.trim());
    return todos.filter(
      (c) =>
        (estado === "todos" || c.status === estado) &&
        (!q || plano(`${c.name} ${c.summary ?? ""} ${c.email ?? ""} ${c.phone ?? ""}`).includes(q)),
    );
  }, [todos, busqueda, estado]);

  const filtrando = busqueda.trim() !== "" || estado !== "todos";

  return (
    <Pantalla>
      <div className="flex items-end justify-between gap-3">
        <div>
          <Eyebrow>Tu cartera</Eyebrow>
          <Titulo as="h1" className="mt-1">
            Clientes
          </Titulo>
        </div>
        <Button
          tamano="sm"
          variante="secundario"
          icono={<Plus size={20} strokeWidth={1.75} aria-hidden="true" />}
          onClick={() => setCreando(true)}
        >
          Nuevo
        </Button>
      </div>

      {clientes.isPending ? (
        <div className="mt-5">
          <Cargando filas={4} />
        </div>
      ) : todos.length === 0 ? (
        <div className="mt-5">
          <Vacio titulo="Todavía no cargaste clientes">
            Grabá un audio contando cómo te fue con alguien y Kairos arma su ficha. También podés cargarlo a mano.
          </Vacio>
        </div>
      ) : (
        <>
          <div className="relative mt-4">
            <Search
              size={20}
              strokeWidth={1.75}
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-texto-suave"
            />
            <input
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar clientes"
              aria-label="Buscar clientes"
              className="block min-h-12 w-full rounded-md border border-linea-control bg-superficie pr-4 pl-11 text-cuerpo text-tinta placeholder:text-texto-suave"
            />
          </div>

          <div
            role="group"
            aria-label="Filtrar por estado"
            className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 py-1 [scrollbar-width:none]"
          >
            <ChipBoton activo={estado === "todos"} onClick={() => setEstado("todos")}>
              Todos · {todos.length}
            </ChipBoton>
            {ESTADOS.filter((e) => cuenta[e]).map((e) => (
              <ChipBoton key={e} activo={estado === e} onClick={() => setEstado(e)}>
                {PLURAL[e]} · {cuenta[e]}
              </ChipBoton>
            ))}
          </div>

          <p className="mt-3 mb-2 text-pie text-texto-suave" role="status">
            {lista.length === 1 ? "1 cliente" : `${lista.length} clientes`}
            {filtrando ? " con ese filtro" : ""}
          </p>

          {lista.length === 0 ? (
            <Vacio titulo="Nadie coincide con esa búsqueda">Probá con otro nombre o sacá el filtro.</Vacio>
          ) : (
            <ul className="space-y-3">
              {lista.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/clientes/${c.id}`}
                    className="block rounded-lg border border-linea bg-superficie p-4 hover:bg-superficie-tinte"
                  >
                    <FilaCliente
                      nombre={c.name}
                      detalle={
                        <>
                          <span className="block text-texto">{c.summary ?? "Todavía sin ficha"}</span>
                          <span className="block">
                            {c.last_contact_at
                              ? `Último contacto ${haceCuanto(c.last_contact_at)}`
                              : "Sin contacto todavía"}
                          </span>
                        </>
                      }
                      abajo={
                        c.status !== "active" ? <Chip variante="descarte">{ESTADO_CLIENTE[c.status]}</Chip> : undefined
                      }
                      derecha={
                        <ChevronRight size={20} strokeWidth={1.75} aria-hidden="true" className="shrink-0 text-texto-suave" />
                      }
                    />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <NuevoCliente abierta={creando} onCerrar={() => setCreando(false)} />
    </Pantalla>
  );
}
