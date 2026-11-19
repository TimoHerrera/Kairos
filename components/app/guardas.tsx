"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useAgent } from "@/lib/data/hooks";
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

/**
 * La primera vez, antes de usar la app, pasa por la bienvenida:
 * aceptar la privacidad, los permisos y cómo instalarla.
 */
export function RequiereBienvenida() {
  const agente = useAgent();
  const router = useRouter();
  // Solo con datos frescos: una copia vieja en caché no debe mandar de vuelta a la bienvenida.
  const pendiente = agente.data && !agente.isFetching && !agente.data.settings.privacy_accepted_at;
  useEffect(() => {
    if (pendiente) router.replace("/bienvenida");
  }, [pendiente, router]);
  return null;
}
