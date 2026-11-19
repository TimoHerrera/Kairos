import type { NewProperty } from "@/lib/data";

/**
 * Fuentes externas de propiedades: portales con API o feeds oficiales, para más adelante.
 * Nada de scraping: los términos de los portales suelen prohibirlo y se rompe seguido.
 * Hoy las propiedades entran a mano, pegando el aviso o importando un CSV.
 */
export interface FuenteDePropiedades {
  id: string;
  nombre: string;
  /** Propiedades publicadas desde `desde`, ya en el formato de Kairos (source: "imported"). */
  traerNuevas(desde: Date): Promise<NewProperty[]>;
}

export const FUENTES: FuenteDePropiedades[] = [];
