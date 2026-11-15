"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createContext, useContext, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { getDataSource, type Session } from "@/lib/data";

/**
 * undefined: todavía no sabemos (primer render, antes de leer el almacenamiento).
 * null: no hay sesión.
 */
type EstadoSesion = Session | null | undefined;

const SesionContext = createContext<EstadoSesion>(undefined);

// useSyncExternalStore necesita la misma referencia mientras la sesión no cambie.
let ultima: Session | null = null;
function leerSesion(): Session | null {
  const actual = getDataSource().auth.getSession();
  if (actual?.agentId === ultima?.agentId && actual?.email === ultima?.email) return ultima;
  ultima = actual;
  return ultima;
}

function suscribir(avisar: () => void) {
  return getDataSource().auth.onChange(avisar);
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 30_000, retry: false, refetchOnWindowFocus: false } },
      }),
  );
  const sesion = useSyncExternalStore<EstadoSesion>(suscribir, leerSesion, () => undefined);

  // Al cerrar sesión o cambiar de agente no queda nada del anterior en memoria.
  const agenteAnterior = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    if (sesion === undefined) return;
    const actual = sesion?.agentId ?? null;
    if (agenteAnterior.current !== undefined && agenteAnterior.current !== actual) queryClient.clear();
    agenteAnterior.current = actual;
  }, [sesion, queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      <SesionContext.Provider value={sesion}>{children}</SesionContext.Provider>
    </QueryClientProvider>
  );
}

export function useSession(): EstadoSesion {
  return useContext(SesionContext);
}
