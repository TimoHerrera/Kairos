import Image from "next/image";
import { cn } from "@/lib/cn";

/**
 * El logotipo no se retipea: siempre los archivos originales de /public/brand.
 * Por ahora son los PNG originales que venían dentro del prototipo;
 * cuando lleguen los SVG se cambian acá y en ningún otro lado.
 *
 * Reglas del manual: ancho mínimo 96 px, nunca el negativo sobre claro,
 * nunca estirado, rotado, recoloreado ni con sombra.
 */
const ARCHIVOS = {
  negativo: { src: "/brand/logo-negativo.png", width: 934, height: 278 },
  positivo: { src: "/brand/logo-positivo.png", width: 934, height: 278 },
} as const;

export const LOGO_ANCHO_MINIMO = 96;
export const SIMBOLO_TAMANO_MINIMO = 32;

type Version = keyof typeof ARCHIVOS | "auto";

function LogoImg({ version, ancho, className }: { version: keyof typeof ARCHIVOS; ancho: number; className?: string }) {
  const a = ARCHIVOS[version];
  return (
    <Image
      src={a.src}
      alt="Kairos"
      width={ancho}
      height={Math.round((ancho * a.height) / a.width)}
      className={cn("h-auto", className)}
      style={{ width: ancho }}
      priority
    />
  );
}

/**
 * version="auto" sigue al tema: positivo sobre claro, negativo sobre oscuro.
 * Sobre un fondo de marca fijo (noche) usá version="negativo".
 */
export function Logo({ version = "auto", ancho = 120, className }: { version?: Version; ancho?: number; className?: string }) {
  const w = Math.max(ancho, LOGO_ANCHO_MINIMO);
  if (version !== "auto") return <LogoImg version={version} ancho={w} className={className} />;
  return (
    <>
      <LogoImg version="positivo" ancho={w} className={cn("solo-claro", className)} />
      <LogoImg version="negativo" ancho={w} className={cn("solo-oscuro", className)} />
    </>
  );
}

/**
 * El símbolo: la "o" con la llave sobre noche. Avatar de Kairos, avisos y notificaciones.
 */
export function Simbolo({ tamano = 40, className }: { tamano?: number; className?: string }) {
  const t = Math.max(tamano, SIMBOLO_TAMANO_MINIMO);
  return (
    <Image
      src="/brand/icono-app.png"
      alt=""
      aria-hidden="true"
      width={t}
      height={t}
      className={cn("shrink-0 rounded-full", className)}
      style={{ width: t, height: t }}
    />
  );
}
