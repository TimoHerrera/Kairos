import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

/** sobreNoche: el principal cuando el fondo es noche fijo (splash, tarjeta destacada). */
export type VarianteBoton = "principal" | "secundario" | "terciario" | "sobreNoche";
type Tamano = "md" | "sm";

const base =
  "inline-flex items-center justify-center gap-2 rounded-md text-boton select-none " +
  "transition-colors duration-150 disabled:cursor-not-allowed aria-disabled:cursor-not-allowed";

const variantes: Record<VarianteBoton, string> = {
  principal:
    "bg-acento text-sobre-acento hover:bg-acento-presionado active:bg-acento-presionado " +
    "disabled:bg-superficie-tinte disabled:text-texto-suave disabled:border disabled:border-linea-control",
  secundario:
    "border border-linea-control bg-superficie text-tinta hover:bg-superficie-tinte active:bg-superficie-tinte " +
    "disabled:bg-superficie-tinte disabled:text-texto-suave",
  sobreNoche: "bg-lima text-noche hover:bg-[#b4e052] active:bg-[#b4e052] focus-visible:outline-lima",
  terciario:
    "text-acento hover:bg-superficie-tinte active:bg-superficie-tinte disabled:text-texto-suave",
};

// El área táctil nunca baja de 44 px.
const tamanos: Record<Tamano, string> = {
  md: "min-h-12 px-6",
  sm: "min-h-11 px-4",
};

type PropsComunes = {
  variante?: VarianteBoton;
  tamano?: Tamano;
  ancho?: "auto" | "completo";
  icono?: ReactNode;
  className?: string;
  children: ReactNode;
};

function clases({ variante = "principal", tamano = "md", ancho = "auto", className }: PropsComunes) {
  return cn(base, variantes[variante], tamanos[tamano], ancho === "completo" && "w-full", className);
}

export function Button({
  variante,
  tamano,
  ancho,
  icono,
  className,
  children,
  type = "button",
  ...rest
}: PropsComunes & Omit<ComponentProps<"button">, "className" | "children">) {
  return (
    <button type={type} className={clases({ variante, tamano, ancho, className, children })} {...rest}>
      {icono}
      {children}
    </button>
  );
}

export function ButtonLink({
  variante,
  tamano,
  ancho,
  icono,
  className,
  children,
  ...rest
}: PropsComunes & Omit<ComponentProps<typeof Link>, "className" | "children">) {
  return (
    <Link className={clases({ variante, tamano, ancho, className, children })} {...rest}>
      {icono}
      {children}
    </Link>
  );
}
