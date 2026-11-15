import { createMockDataSource, type KeyValueStorage } from "./mock";
import type { DataSource } from "./source";
import { createSupabaseDataSource } from "./supabase";

export * from "./source";
export * from "./types";

/**
 * De dónde salen los datos: `mock` (por defecto) o `supabase`.
 * La variable es pública porque la fuente mock corre en el navegador.
 */
export const DATA_SOURCE_KIND: "mock" | "supabase" =
  process.env.NEXT_PUBLIC_DATA_SOURCE === "supabase" ? "supabase" : "mock";

let instancia: DataSource | null = null;

function browserStorage(): KeyValueStorage | undefined {
  try {
    if (typeof window === "undefined") return undefined;
    const prueba = "kairos:prueba";
    window.localStorage.setItem(prueba, "1");
    window.localStorage.removeItem(prueba);
    return window.localStorage;
  } catch {
    // Modo privado o almacenamiento bloqueado: se usa memoria y los datos duran la visita.
    return undefined;
  }
}

/** Una sola instancia por pestaña. */
export function getDataSource(): DataSource {
  if (!instancia) {
    instancia =
      DATA_SOURCE_KIND === "supabase" ? createSupabaseDataSource() : createMockDataSource({ storage: browserStorage() });
  }
  return instancia;
}
