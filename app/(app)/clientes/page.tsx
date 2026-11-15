"use client";

import { FilaCliente } from "@/components/app/filas";
import { Cargando, Pantalla, Vacio } from "@/components/app/pantalla";
import { Eyebrow, Titulo } from "@/components/ui/bloque";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { useBuyers } from "@/lib/data/hooks";
import { ESTADO_CLIENTE } from "@/lib/domain/labels";
import { haceCuanto } from "@/lib/format/tiempo";

export default function Clientes() {
  const clientes = useBuyers();
  const lista = clientes.data ?? [];

  return (
    <Pantalla>
      <Eyebrow>Tu cartera</Eyebrow>
      <Titulo as="h1" className="mt-1">
        Clientes
      </Titulo>
      <p className="mt-1 mb-5 text-cuerpo-s text-texto-suave">
        {clientes.isPending ? " " : lista.length === 1 ? "1 cliente" : `${lista.length} clientes`}
      </p>

      {clientes.isPending ? (
        <Cargando filas={4} />
      ) : lista.length === 0 ? (
        <Vacio titulo="Todavía no cargaste clientes">
          Grabá un audio contando cómo te fue con alguien y Kairos arma su ficha.
        </Vacio>
      ) : (
        <ul className="space-y-3">
          {lista.map((c) => (
            <li key={c.id}>
              <Card>
                <FilaCliente
                  nombre={c.name}
                  detalle={
                    <>
                      {c.summary ? <span className="block text-texto">{c.summary}</span> : null}
                      <span className="block">
                        {c.last_contact_at ? `Último contacto ${haceCuanto(c.last_contact_at)}` : "Sin contacto todavía"}
                      </span>
                    </>
                  }
                  abajo={c.status !== "active" ? <Chip variante="descarte">{ESTADO_CLIENTE[c.status]}</Chip> : undefined}
                />
              </Card>
            </li>
          ))}
        </ul>
      )}
    </Pantalla>
  );
}
