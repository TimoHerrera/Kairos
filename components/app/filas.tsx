import { Building2 } from "lucide-react";
import Image from "next/image";
import type { ReactNode } from "react";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/cn";
import type { Property } from "@/lib/data";
import { ambientesCorto, pisoTexto } from "@/lib/domain/labels";
import { formatMonto, formatNumero } from "@/lib/format";

/** Fila de cliente: avatar, nombre, una línea de contexto y lo que haga falta a la derecha o abajo. */
export function FilaCliente({
  nombre,
  detalle,
  abajo,
  derecha,
  className,
}: {
  nombre: string;
  detalle?: ReactNode;
  abajo?: ReactNode;
  derecha?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <Avatar nombre={nombre} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] leading-5 font-semibold text-tinta">{nombre}</p>
        {detalle ? <p className="mt-0.5 text-[13px] leading-[18px] text-texto-suave">{detalle}</p> : null}
        {abajo ? <div className="mt-2 flex flex-wrap gap-1.5">{abajo}</div> : null}
      </div>
      {derecha}
    </div>
  );
}

/** Foto de la propiedad. Si no hay, un placeholder neutro con ícono. */
export function FotoPropiedad({
  propiedad,
  className,
  sizes = "96px",
}: {
  propiedad: Pick<Property, "photos" | "address">;
  className?: string;
  sizes?: string;
}) {
  const foto = propiedad.photos[0];
  return (
    <div className={cn("relative shrink-0 overflow-hidden bg-superficie-tinte", className)}>
      {foto ? (
        <Image src={foto} alt={`Foto de ${propiedad.address}`} fill sizes={sizes} className="object-cover" unoptimized />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-texto-suave">
          <Building2 size={24} strokeWidth={1.75} aria-label="Sin foto" />
        </div>
      )}
    </div>
  );
}

/** "3 amb · 72 m² · 4º piso" */
export function specsPropiedad(p: Property): string {
  return [
    ambientesCorto(p.property_type, p.rooms),
    p.covered_m2 ? `${formatNumero(p.covered_m2)} m²` : null,
    pisoTexto(p.floor),
  ]
    .filter(Boolean)
    .join(" · ");
}

/** "Gorriti 4800, Palermo Soho" */
export function direccionPropiedad(p: Pick<Property, "address" | "neighborhood" | "subzone">): string {
  const zona = p.subzone
    ? p.subzone.startsWith(p.neighborhood)
      ? p.subzone
      : `${p.neighborhood} ${p.subzone}`
    : p.neighborhood;
  return `${p.address}, ${zona}`;
}

export function FilaPropiedad({ propiedad }: { propiedad: Property }) {
  return (
    <div className="flex items-center gap-3">
      <FotoPropiedad propiedad={propiedad} className="size-16 rounded-md" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] leading-5 font-semibold text-tinta">{direccionPropiedad(propiedad)}</p>
        <p className="mt-0.5 text-[15px] leading-5 font-semibold text-tinta">
          {formatMonto(propiedad.price, propiedad.currency)}
        </p>
        <p className="mt-0.5 text-[13px] leading-[18px] text-texto-suave">{specsPropiedad(propiedad)}</p>
      </div>
    </div>
  );
}
