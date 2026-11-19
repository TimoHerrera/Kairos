"use client";

import { Check } from "lucide-react";
import { useEffect } from "react";

/** Aviso flotante arriba de todo ("Enviado a Martina"). Entra con fundido de 8 px y se va solo. */
export function Toast({ texto, onCerrar, duracion = 4000 }: { texto: string | null; onCerrar: () => void; duracion?: number }) {
  useEffect(() => {
    if (!texto) return;
    const id = window.setTimeout(onCerrar, duracion);
    return () => window.clearTimeout(id);
  }, [texto, onCerrar, duracion]);

  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 top-[max(16px,env(safe-area-inset-top))] z-50 flex justify-center px-4">
      {texto ? (
        <p className="pointer-events-auto flex animate-aviso items-center gap-2 rounded-full bg-noche px-4 py-2.5 text-[14px] leading-5 font-semibold text-papel shadow-flotante">
          <Check size={18} strokeWidth={2.25} aria-hidden="true" className="text-lima" />
          {texto}
        </p>
      ) : null}
    </div>
  );
}
