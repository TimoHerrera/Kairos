import type { Metadata } from "next";
import { Suspense } from "react";
import { Cargando, Pantalla } from "@/components/app/pantalla";
import type { ModoConfigurado } from "@/lib/audio/grabadora";
import { NuevaNota } from "./nueva-nota";

export const metadata: Metadata = { title: "Nueva nota" };

/**
 * TRANSCRIBE_PROVIDER fuerza un modo. Sin configurar ("auto"), usa el micrófono real
 * en los navegadores que transcriben en vivo; la nota de ejemplo queda a un toque.
 */
function modoTranscripcion(): ModoConfigurado {
  const valor = process.env.TRANSCRIBE_PROVIDER;
  if (valor === "openai" && process.env.OPENAI_API_KEY) return "openai";
  if (valor === "webspeech" || valor === "openai") return "webspeech";
  if (valor === "mock") return "mock";
  return "auto";
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
