/**
 * Barrios limítrofes de CABA (y algunos de GBA). Una propiedad en un barrio limítrofe
 * puede encajar, pero con penalización. Configurable: se puede apagar con { limitrofes: false }.
 */
const PARES: Array<[string, string]> = [
  ["Palermo", "Villa Crespo"],
  ["Palermo", "Colegiales"],
  ["Palermo", "Belgrano"],
  ["Palermo", "Recoleta"],
  ["Palermo", "Chacarita"],
  ["Palermo", "Almagro"],
  ["Villa Crespo", "Almagro"],
  ["Villa Crespo", "Caballito"],
  ["Villa Crespo", "Chacarita"],
  ["Belgrano", "Núñez"],
  ["Belgrano", "Colegiales"],
  ["Belgrano", "Coghlan"],
  ["Belgrano", "Villa Urquiza"],
  ["Colegiales", "Chacarita"],
  ["Colegiales", "Villa Ortúzar"],
  ["Caballito", "Almagro"],
  ["Caballito", "Flores"],
  ["Caballito", "Boedo"],
  ["Núñez", "Saavedra"],
  ["Almagro", "Boedo"],
  ["Almagro", "Recoleta"],
  ["Recoleta", "Barrio Norte"],
  ["Olivos", "Vicente López"],
  ["Martínez", "San Isidro"],
  ["Olivos", "Martínez"],
];

const plano = (t: string) =>
  t
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

export function sonLimitrofes(a: string, b: string): boolean {
  const x = plano(a);
  const y = plano(b);
  return PARES.some(([p, q]) => (plano(p) === x && plano(q) === y) || (plano(p) === y && plano(q) === x));
}

export function mismoBarrio(a: string | null | undefined, b: string | null | undefined): boolean {
  return Boolean(a && b && plano(a) === plano(b));
}
