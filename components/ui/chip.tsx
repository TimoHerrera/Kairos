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
