"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";
import { cn } from "@/lib/cn";
import { aplicarPreferencia, leerPreferencia, type PreferenciaTema } from "@/lib/theme";

const EVENTO = "kairos:tema";

function suscribir(avisar: () => void) {
  window.addEventListener(EVENTO, avisar);
  window.addEventListener("storage", avisar);
  return () => {
    window.removeEventListener(EVENTO, avisar);
    window.removeEventListener("storage", avisar);
  };
}

const OPCIONES: Array<{ valor: PreferenciaTema; etiqueta: string; Icono: typeof Sun }> = [
  { valor: "system", etiqueta: "Sistema", Icono: Monitor },
  { valor: "light", etiqueta: "Claro", Icono: Sun },
  { valor: "dark", etiqueta: "Oscuro", Icono: Moon },
];

export function ThemeSwitch({ className }: { className?: string }) {
  const preferencia = useSyncExternalStore(suscribir, leerPreferencia, () => "system" as const);

  function elegir(valor: PreferenciaTema) {
    aplicarPreferencia(valor);
    window.dispatchEvent(new Event(EVENTO));
  }

  return (
    <div
      role="radiogroup"
      aria-label="Tema"
      className={cn("inline-flex rounded-md border border-linea-control bg-superficie p-1", className)}
    >
      {OPCIONES.map(({ valor, etiqueta, Icono }) => {
        const activo = preferencia === valor;
        return (
          <button
            key={valor}
            type="button"
            role="radio"
            aria-checked={activo}
            onClick={() => elegir(valor)}
            className={cn(
              "inline-flex min-h-11 items-center gap-2 rounded-sm px-3 text-[14px] leading-5 font-semibold transition-colors duration-150",
              activo ? "bg-superficie-tinte text-acento" : "text-texto hover:bg-superficie-tinte",
            )}
          >
            <Icono size={20} strokeWidth={1.75} aria-hidden="true" />
            {etiqueta}
          </button>
        );
      })}
    </div>
  );
}
