import { DataError, type DataSource } from "../source";

/**
 * Implementación de Supabase. Se conecta en la fase 7.
 * El esquema y la RLS ya están escritos en supabase/migrations.
 */
export function createSupabaseDataSource(): DataSource {
  throw new DataError(
    "not_implemented",
    "La conexión con Supabase llega en la fase 7. Usá NEXT_PUBLIC_DATA_SOURCE=mock.",
  );
}
