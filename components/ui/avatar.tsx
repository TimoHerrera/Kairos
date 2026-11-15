import { cn } from "@/lib/cn";
import { iniciales } from "@/lib/format";

const tamanos = {
  sm: "size-7 text-[10px]",
  md: "size-10 text-[14px]",
  lg: "size-14 text-[18px]",
} as const;

export function Avatar({
  nombre,
  tamano = "md",
  className,
}: {
  nombre: string;
  tamano?: keyof typeof tamanos;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-chip font-semibold text-sobre-chip",
        tamanos[tamano],
        className,
      )}
    >
      {iniciales(nombre)}
    </span>
  );
}

/** El punto lima marca "acá está Kairos" o "esta es la oportunidad". Solo sobre oscuro. */
export function PuntoLima({ className }: { className?: string }) {
  return <span aria-hidden="true" className={cn("inline-block size-2 rounded-full bg-lima", className)} />;
}
