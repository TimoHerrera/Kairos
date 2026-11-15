import { CircleAlert } from "lucide-react";
import { useId, type ComponentProps } from "react";
import { cn } from "@/lib/cn";

/** Campo de texto con etiqueta visible. El error va con ícono y palabra, nunca solo color. */
export function Campo({
  etiqueta,
  ayuda,
  error,
  className,
  ...rest
}: {
  etiqueta: string;
  ayuda?: string;
  error?: string | null;
} & Omit<ComponentProps<"input">, "id">) {
  const id = useId();
  const descripcion = error ? `${id}-error` : ayuda ? `${id}-ayuda` : undefined;
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block text-[14px] leading-5 font-semibold text-tinta">
        {etiqueta}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={descripcion}
        className={cn(
          "block min-h-12 w-full rounded-md border bg-superficie px-4 text-cuerpo text-tinta placeholder:text-texto-suave",
          error ? "border-error" : "border-linea-control",
        )}
        {...rest}
      />
      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-1 flex items-start gap-1 text-cuerpo-s text-error">
          <CircleAlert size={16} strokeWidth={1.75} aria-hidden="true" className="mt-0.5 shrink-0" />
          {error}
        </p>
      ) : ayuda ? (
        <p id={`${id}-ayuda`} className="mt-1 text-pie text-texto-suave">
          {ayuda}
        </p>
      ) : null}
    </div>
  );
}
