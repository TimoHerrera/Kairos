import type { Metadata } from "next";
import { Suspense } from "react";
import { Cargando, Pantalla } from "@/components/app/pantalla";
import { FichaCliente } from "./ficha";

export const metadata: Metadata = { title: "Ficha del cliente" };

/** El id llega recién con la URL: el shell se arma sin él y la ficha entra después. */
export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense
      fallback={
        <Pantalla>
          <Cargando filas={5} />
        </Pantalla>
      }
    >
      <FichaCliente params={params} />
    </Suspense>
  );
}
