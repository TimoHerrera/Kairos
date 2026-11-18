"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";

/**
 * Hoja que sube desde abajo (bottom sheet). Es de lo poco que flota, así que lleva la sombra.
 * Usa <dialog>: atrapa el foco, se cierra con Escape y devuelve el foco al botón que la abrió.
 */
export function Hoja({
  abierta,
  onCerrar,
  titulo,
  descripcion,
  children,
}: {
  abierta: boolean;
  onCerrar: () => void;
  titulo: string;
  descripcion?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const idTitulo = useId();

  useEffect(() => {
    const dialogo = ref.current;
    if (!dialogo) return;
    if (abierta && !dialogo.open) dialogo.showModal();
    if (!abierta && dialogo.open) dialogo.close();
  }, [abierta]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={idTitulo}
      onClose={onCerrar}
      onClick={(e) => {
        // Un toque en el fondo (fuera del contenido) la cierra.
        if (e.target === ref.current) onCerrar();
      }}
      className="fixed inset-x-0 top-auto bottom-0 m-0 mx-auto max-h-[88dvh] w-full max-w-[430px] overflow-visible rounded-t-xl border border-b-0 border-linea bg-superficie p-0 text-texto shadow-flotante backdrop:bg-noche/60 open:animate-aviso"
    >
      {abierta ? (
        <div className="flex max-h-[88dvh] flex-col">
          <div className="flex items-start gap-3 px-4 pt-4">
            <div className="min-w-0 flex-1">
              <h2 id={idTitulo} className="text-[17px] leading-[22px] font-semibold text-tinta">
                {titulo}
              </h2>
              {descripcion ? <p className="mt-0.5 text-cuerpo-s text-texto-suave">{descripcion}</p> : null}
            </div>
            <button
              type="button"
              onClick={onCerrar}
              aria-label="Cerrar"
              className="-mt-2 -mr-2 flex size-11 shrink-0 items-center justify-center rounded-full text-texto hover:bg-superficie-tinte"
            >
              <X size={20} strokeWidth={1.75} aria-hidden="true" />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-4 pb-[max(16px,env(safe-area-inset-bottom))]">
            {children}
          </div>
        </div>
      ) : null}
    </dialog>
  );
}

/** Pie de una hoja: la acción principal y cancelar. */
export function HojaAcciones({ children }: { children: ReactNode }) {
  return <div className="mt-6 flex flex-col gap-2">{children}</div>;
}
