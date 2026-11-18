import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * busca: lo que busca el cliente, en sus palabras ("3 ambientes", "Palermo").
 * oportunidad: lima, para "Nueva oportunidad". Es el único chip que se enciende.
 * descarte: con borde, para lo que descartó ("Descartó PB").
 * exito / alerta / error: estados, siempre con ícono o palabra, nunca solo color.
 */
export type VarianteChip = "busca" | "oportunidad" | "descarte" | "exito" | "alerta" | "error";

const variantes: Record<VarianteChip, string> = {
  busca: "bg-chip text-sobre-chip",
  oportunidad: "bg-lima text-noche",
  descarte: "border border-linea-control text-texto",
  exito: "bg-exito-tinte text-exito",
  alerta: "bg-alerta-tinte text-alerta",
  error: "bg-error-tinte text-error",
};

export function Chip({
  variante = "busca",
  icono,
  className,
  children,
}: {
  variante?: VarianteChip;
  icono?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-7 items-center gap-1 whitespace-nowrap rounded-full px-3 text-[13px] leading-4 font-semibold",
        variantes[variante],
        className,
      )}
    >
      {icono}
      {children}
    </span>
  );
}

/**
 * Chip que se puede quitar: el texto y una ✕ con área táctil de 44 px.
 * Para lo que el agente edita a mano en la ficha.
 */
export function ChipEditable({
  variante = "busca",
  icono,
  onQuitar,
  children,
}: {
  variante?: VarianteChip;
  icono?: ReactNode;
  onQuitar: () => void;
  children: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-9 items-center gap-1 rounded-full pr-1 pl-3 text-[13px] leading-4 font-semibold whitespace-nowrap",
        variantes[variante],
      )}
    >
      {icono}
      {children}
      <button
        type="button"
        onClick={onQuitar}
        aria-label={`Quitar ${children}`}
        className="relative flex size-7 items-center justify-center rounded-full after:absolute after:-inset-2 hover:bg-noche/10"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" aria-hidden="true">
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>
    </span>
  );
}

/** Chip que funciona como botón: filtros de una lista o "Agregar". */
export function ChipBoton({
  activo,
  icono,
  onClick,
  children,
}: {
  /** Para filtros: se anuncia como presionado. Omitilo en acciones como "Agregar". */
  activo?: boolean;
  icono?: ReactNode;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activo}
      className={cn(
        "relative inline-flex h-9 shrink-0 items-center gap-1 rounded-full px-3 text-[13px] leading-4 font-semibold whitespace-nowrap after:absolute after:-inset-y-1 after:inset-x-0",
        activo ? "bg-acento text-sobre-acento" : "border border-linea-control text-texto hover:bg-superficie-tinte",
      )}
    >
      {icono}
      {children}
    </button>
  );
}
