"use client";

import { Building2, House, User, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const TABS = [
  { href: "/hoy", etiqueta: "Hoy", Icono: House },
  { href: "/clientes", etiqueta: "Clientes", Icono: Users },
  { href: "/propiedades", etiqueta: "Propiedades", Icono: Building2 },
  { href: "/perfil", etiqueta: "Perfil", Icono: User },
] as const;

/** Navegación principal: Hoy · Clientes · Propiedades · Perfil. Íconos de 24 px, acento en el activo. */
export function TabBar({ activa }: { activa?: string }) {
  const pathname = usePathname();
  const actual = activa ?? pathname;
  return (
    <nav
      aria-label="Principal"
      className="flex shrink-0 border-t border-linea bg-superficie px-2 pt-2 pb-[max(8px,env(safe-area-inset-bottom))]"
    >
      {TABS.map(({ href, etiqueta, Icono }) => {
        const activo = actual === href || actual.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            aria-current={activo ? "page" : undefined}
            className={cn(
              "flex min-h-12 flex-1 flex-col items-center justify-center gap-0.5 rounded-sm text-[11px] leading-[14px] font-medium",
              activo ? "text-acento" : "text-texto-suave",
            )}
          >
            <Icono size={24} strokeWidth={1.75} aria-hidden="true" />
            {etiqueta}
          </Link>
        );
      })}
    </nav>
  );
}
