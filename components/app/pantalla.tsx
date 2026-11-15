import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * El marco de la app: a 390 px ocupa toda la pantalla; en desktop queda
 * centrado como un teléfono, con el margen de 64 px del manual.
 */
export function Marco({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className="flex flex-1 justify-center md:py-16">
      <div
        className={cn(
          "relative flex h-dvh w-full max-w-[430px] flex-col overflow-hidden bg-fondo",
          "md:h-[calc(100dvh-128px)] md:min-h-[600px] md:rounded-xl md:border md:border-linea",
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}

/**
 * Una pantalla dentro del marco: el contenido hace scroll y la acción fija
 * (por ejemplo "Grabar audio") queda siempre a la vista, arriba de la tab bar.
 */
export function Pantalla({
  children,
  accion,
  className,
}: {
  children: ReactNode;
  accion?: ReactNode;
  className?: string;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <main className={cn("min-h-0 flex-1 overflow-y-auto px-4 pt-[max(16px,env(safe-area-inset-top))] pb-6", className)}>
        {children}
      </main>
      {accion ? <div className="shrink-0 border-t border-linea bg-superficie px-4 py-3">{accion}</div> : null}
    </div>
  );
}

/** Título de sección dentro de una pantalla ("Clientes que encajan"). */
export function SeccionTitulo({ children, extra }: { children: ReactNode; extra?: ReactNode }) {
  return (
    <div className="mt-6 mb-3 flex items-center gap-2">
      <h2 className="text-[17px] leading-[22px] font-semibold text-tinta">{children}</h2>
      {extra}
    </div>
  );
}

/** Estado vacío: una frase que dice qué hacer, sin adornos. */
export function Vacio({ titulo, children }: { titulo: string; children?: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-linea-control px-4 py-8 text-center">
      <p className="text-[16px] leading-[22px] font-semibold text-tinta">{titulo}</p>
      {children ? <p className="mx-auto mt-1 max-w-[30ch] text-cuerpo-s text-texto">{children}</p> : null}
    </div>
  );
}

/** Bloques grises mientras cargan los datos. */
export function Cargando({ filas = 3 }: { filas?: number }) {
  return (
    <div role="status" aria-label="Cargando" className="space-y-3">
      {Array.from({ length: filas }, (_, i) => (
        <div key={i} className="h-[72px] rounded-lg bg-superficie-tinte" />
      ))}
    </div>
  );
}
