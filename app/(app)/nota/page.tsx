import { ArrowLeft, Mic } from "lucide-react";
import type { Metadata } from "next";
import { Pantalla } from "@/components/app/pantalla";
import { Eyebrow, Titulo } from "@/components/ui/bloque";
import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = { title: "Nueva nota" };

/** La grabación, la transcripción y "Armar ficha" llegan en la fase 3. */
export default function NuevaNota() {
  return (
    <Pantalla>
      <ButtonLink
        href="/hoy"
        variante="terciario"
        tamano="sm"
        className="-ml-3"
        icono={<ArrowLeft size={20} strokeWidth={1.75} aria-hidden="true" />}
      >
        Volver
      </ButtonLink>
      <div className="mt-8">
        <Eyebrow>Nueva nota</Eyebrow>
        <Titulo as="h1" className="mt-1">
          Contame cómo te fue
        </Titulo>
        <p className="mt-2 text-cuerpo text-texto">Hablá tranquila, después yo lo ordeno.</p>
      </div>
      <div className="mt-10 flex flex-col items-center text-center">
        <span className="flex size-20 items-center justify-center rounded-full bg-superficie-tinte text-texto-suave">
          <Mic size={32} strokeWidth={1.75} aria-hidden="true" />
        </span>
        <p className="mt-4 max-w-[28ch] text-cuerpo-s text-texto-suave">
          La grabación todavía no está activa. Llega en la próxima etapa.
        </p>
      </div>
    </Pantalla>
  );
}
