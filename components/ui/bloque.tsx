import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Patrón de bloque del manual: eyebrow en acento, título en Fraunces
 * con una sola palabra en acento, y bajada en Inter.
 */
export function Eyebrow({ className, children }: { className?: string; children: ReactNode }) {
  return <p className={cn("text-eyebrow text-acento", className)}>{children}</p>;
}

const tamanos = {
  xl: "text-titulo-xl",
  l: "text-titulo-l",
  m: "text-titulo-m",
  s: "text-titulo-s",
} as const;

export function Titulo({
  tamano = "m",
  as: Tag = "h2",
  className,
  children,
}: {
  tamano?: keyof typeof tamanos;
  as?: "h1" | "h2" | "h3";
  className?: string;
  children: ReactNode;
}) {
  return <Tag className={cn(tamanos[tamano], "text-tinta text-balance", className)}>{children}</Tag>;
}

/** La palabra destacada del título. Una sola por título. */
export function Acento({ children }: { children: ReactNode }) {
  return <span className="text-acento">{children}</span>;
}

export function Bajada({ className, children }: { className?: string; children: ReactNode }) {
  return <p className={cn("text-cuerpo text-texto", className)}>{children}</p>;
}
