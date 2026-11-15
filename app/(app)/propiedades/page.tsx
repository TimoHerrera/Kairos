"use client";

import { FilaPropiedad } from "@/components/app/filas";
import { Cargando, Pantalla, Vacio } from "@/components/app/pantalla";
import { Eyebrow, Titulo } from "@/components/ui/bloque";
import { Card } from "@/components/ui/card";
import { useProperties } from "@/lib/data/hooks";

export default function Propiedades() {
  const propiedades = useProperties();
  const lista = propiedades.data ?? [];

  return (
    <Pantalla>
      <Eyebrow>Tu cartera</Eyebrow>
      <Titulo as="h1" className="mt-1">
        Propiedades
      </Titulo>
      <p className="mt-1 mb-5 text-cuerpo-s text-texto-suave">
        {propiedades.isPending ? " " : lista.length === 1 ? "1 propiedad" : `${lista.length} propiedades`}
      </p>

      {propiedades.isPending ? (
        <Cargando filas={4} />
      ) : lista.length === 0 ? (
        <Vacio titulo="Todavía no hay propiedades">
          Cuando cargues una, Kairos te dice a qué clientes les sirve.
        </Vacio>
      ) : (
        <ul className="space-y-3">
          {lista.map((p) => (
            <li key={p.id}>
              <Card className="p-3">
                <FilaPropiedad propiedad={p} />
              </Card>
            </li>
          ))}
        </ul>
      )}
    </Pantalla>
  );
}
