import { useId, type ReactNode } from "react";

/** Casilla de verificación con la etiqueta a la derecha y toda la fila tocable (44 px). */
export function Casilla({
  checked,
  onChange,
  children,
  ayuda,
}: {
  checked: boolean;
  onChange: (valor: boolean) => void;
  children: ReactNode;
  ayuda?: string;
}) {
  const id = useId();
  return (
    <label htmlFor={id} className="flex min-h-11 cursor-pointer items-center gap-3 py-1">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-5 shrink-0 cursor-pointer rounded-sm border-linea-control accent-[var(--acento)]"
      />
      <span>
        <span className="block text-cuerpo text-tinta">{children}</span>
        {ayuda ? <span className="block text-pie text-texto-suave">{ayuda}</span> : null}
      </span>
    </label>
  );
}
