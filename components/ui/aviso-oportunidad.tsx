import type { ReactNode } from "react";
import { Simbolo } from "@/components/brand/logo";
import { cn } from "@/lib/cn";

/**
 * Aviso de oportunidad (manual, pág. 13 y 15).
 * Es de lo poco que flota, así que lleva la única sombra del sistema.
 * Entra deslizando 8 px con fundido, en 200 ms.
 */
export function AvisoOportunidad({
  cuando,
  titulo,
  resumen,
  acciones,
  etiqueta,
  mostrarOrigen = true,
  animar = true,
  className,
}: {
  /** "hace 2 min" */
  cuando: string;
  /** Conclusión primero: "Esta propiedad le sirve a Martina" */
  titulo: string;
  resumen: ReactNode;
  acciones?: ReactNode;
  /** Chip opcional, por ejemplo "Nueva oportunidad" */
  etiqueta?: ReactNode;
  mostrarOrigen?: boolean;
  animar?: boolean;
  className?: string;
}) {
  return (
    <article
      className={cn(
        "flex gap-3 rounded-lg border border-linea bg-superficie p-4 shadow-flotante",
        animar && "animate-aviso",
        className,
      )}
    >
      <Simbolo tamano={36} />
      <div className="min-w-0 flex-1">
        <p className="text-pie text-texto-suave">
          {mostrarOrigen ? `Kairos · ${cuando}` : cuando}
        </p>
        <h3 className="mt-0.5 text-[16px] leading-[22px] font-semibold text-tinta">{titulo}</h3>
        <p className="mt-1 text-cuerpo-s text-texto">{resumen}</p>
        {etiqueta ? <div className="mt-2">{etiqueta}</div> : null}
        {acciones ? <div className="mt-3 flex flex-wrap items-center gap-2">{acciones}</div> : null}
      </div>
    </article>
  );
}
