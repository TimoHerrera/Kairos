import type { Metadata } from "next";
import { Suspense } from "react";
import { Cargando, Pantalla } from "@/components/app/pantalla";
import { DetalleOportunidad } from "./detalle";

export const metadata: Metadata = { title: "Oportunidad" };

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense
      fallback={
        <Pantalla>
          <Cargando filas={4} />
        </Pantalla>
      }
    >
      <DetalleOportunidad params={params} />
    </Suspense>
  );
}
