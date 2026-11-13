import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Tarjeta con borde de 1 px y sin sombra.
 * destacada: fondo noche. Una sola por vista, para el dato o paso más importante.
 */
export function Card({
  destacada = false,
  className,
  children,
  ...rest
}: { destacada?: boolean } & ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "rounded-lg border p-4",
        destacada
          ? "border-destacado bg-destacado text-texto-destacado"
          : "border-linea bg-superficie text-texto",
        className,
      )}
      data-destacada={destacada || undefined}
      {...rest}
    >
      {children}
    </div>
  );
}

/** Número de paso (01, 02, 03) en Fraunces acento. En la destacada va siempre en lima. */
export function CardNumero({ destacada = false, children }: { destacada?: boolean; children: ReactNode }) {
  return (
    <div className={cn("text-titulo-s", destacada ? "text-lima" : "text-acento")} aria-hidden="true">
      {children}
    </div>
  );
}

export function CardTitulo({ destacada = false, children }: { destacada?: boolean; children: ReactNode }) {
  return (
    <h3 className={cn("mt-2 text-[16px] leading-[22px] font-semibold", destacada ? "text-sobre-destacado" : "text-tinta")}>
      {children}
    </h3>
  );
}

export function CardTexto({ children }: { children: ReactNode }) {
  return <p className="mt-1 text-cuerpo-s">{children}</p>;
}
