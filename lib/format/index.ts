/**
 * Cifras con formato argentino: punto de miles y coma decimal.
 * Se arma a mano para que el resultado no dependa de los datos de ICU del entorno.
 */
export function formatNumero(valor: number, decimales = 0): string {
  const signo = valor < 0 ? "-" : "";
  const [entero, fraccion] = Math.abs(valor).toFixed(decimales).split(".");
  const conMiles = entero.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return signo + conMiles + (fraccion ? "," + fraccion : "");
}

export type Moneda = "USD" | "ARS";

/** `USD 172.000` · `$185.000` */
export function formatMonto(valor: number, moneda: Moneda): string {
  return moneda === "USD" ? `USD ${formatNumero(valor)}` : `$${formatNumero(valor)}`;
}

/** Versión corta para chips: `USD 180 mil`, `USD 1,2 M` */
export function formatMontoCorto(valor: number, moneda: Moneda): string {
  const prefijo = moneda === "USD" ? "USD " : "$";
  if (valor >= 1_000_000) {
    const m = valor / 1_000_000;
    return `${prefijo}${formatNumero(m, Number.isInteger(m) ? 0 : 1)} M`;
  }
  if (valor >= 1_000 && valor % 1_000 === 0) return `${prefijo}${formatNumero(valor / 1_000)} mil`;
  return prefijo + formatNumero(valor);
}

export function formatPorcentaje(valor: number): string {
  return `${Math.round(valor)}%`;
}

/** Iniciales para el avatar: "Martina Gómez" → "MG", "Sofía y Pablo" → "SP" */
export function iniciales(nombre: string): string {
  const partes = nombre
    .trim()
    .split(/\s+/)
    .filter((p) => p.length > 1 || /[A-ZÁÉÍÓÚÑ]/.test(p));
  if (partes.length === 0) return "";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}
