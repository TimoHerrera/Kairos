import type { Metadata } from "next";
import { Suspense } from "react";
import { Cargando, Pantalla } from "@/components/app/pantalla";
import type { ModoTranscripcion } from "@/lib/audio/grabadora";
import { NuevaNota } from "./nueva-nota";

export const metadata: Metadata = { title: "Nueva nota" };

function modoTranscripcion(): ModoTranscripcion {
  const valor = process.env.TRANSCRIBE_PROVIDER;
  if (valor === "openai" && process.env.OPENAI_API_KEY) return "openai";
  if (valor === "webspeech" || valor === "openai") return "webspeech";
  return "mock";
}

export default function Page() {
  return (
    <Suspense
      fallback={
        <Pantalla>
          <Cargando filas={4} />
        </Pantalla>
      }
    >
      <NuevaNota modo={modoTranscripcion()} />
    </Suspense>
  );
}
