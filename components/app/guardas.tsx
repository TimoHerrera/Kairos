"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useSession } from "@/lib/session/provider";

/** En el splash y el login: si ya hay sesión, va directo a Hoy. */
export function SeguirSiHaySesion() {
  const sesion = useSession();
  const router = useRouter();
  useEffect(() => {
    if (sesion) router.replace("/hoy");
  }, [sesion, router]);
  return null;
}

/**
 * Envuelve las pantallas de la app: sin sesión, manda al login.
 * Siempre renderiza el contenido (así Next puede armar el shell de cada ruta);
 * mientras no hay sesión las pantallas muestran su estado de carga, sin datos.
 */
export function SoloConSesion({ children }: { children: ReactNode }) {
  const sesion = useSession();
  const router = useRouter();
  useEffect(() => {
    if (sesion === null) router.replace("/login");
  }, [sesion, router]);
  return <>{children}</>;
}
