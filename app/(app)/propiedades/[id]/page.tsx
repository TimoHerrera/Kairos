import type { Metadata } from "next";
import { Suspense } from "react";
import { Cargando, Pantalla } from "@/components/app/pantalla";
import { DetallePropiedad } from "./detalle";

export const metadata: Metadata = { title: "Propiedad" };

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense
      fallback={
        <Pantalla>
          <Cargando filas={4} />
        </Pantalla>
      }
    >
      <DetallePropiedad params={params} />
    </Suspense>
  );
}
