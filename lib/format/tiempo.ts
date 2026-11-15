const MIN = 60_000;
const HORA = 60 * MIN;
const DIA = 24 * HORA;

function plural(n: number, uno: string, muchos: string) {
  return `${n} ${n === 1 ? uno : muchos}`;
}

/** "recién", "hace 4 min", "hace 3 h", "hace 2 días", "hace 4 meses" */
export function haceCuanto(fecha: string | Date, ahora: Date = new Date()): string {
  const ms = Math.max(0, ahora.getTime() - new Date(fecha).getTime());
  if (ms < MIN) return "recién";
  if (ms < HORA) return `hace ${Math.floor(ms / MIN)} min`;
  if (ms < DIA) return `hace ${Math.floor(ms / HORA)} h`;
  const dias = Math.floor(ms / DIA);
  if (dias < 30) return `hace ${plural(dias, "día", "días")}`;
  const meses = Math.floor(dias / 30);
  if (meses < 12) return `hace ${plural(meses, "mes", "meses")}`;
  return `hace ${plural(Math.floor(dias / 365), "año", "años")}`;
}

export function diasDesde(fecha: string | Date, ahora: Date = new Date()): number {
  return Math.floor((ahora.getTime() - new Date(fecha).getTime()) / DIA);
}

/** Un cliente está "para reactivar" con más de 90 días sin contacto. */
export const DIAS_PARA_REACTIVAR = 90;

/** "Buenos días", "Buenas tardes", "Buenas noches" */
export function saludo(ahora: Date = new Date()): string {
  const h = ahora.getHours();
  if (h >= 6 && h < 13) return "Buenos días";
  if (h >= 13 && h < 20) return "Buenas tardes";
  return "Buenas noches";
}

const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

/** "Jueves 12 de noviembre" */
export function fechaLarga(fecha: Date = new Date()): string {
  const dia = DIAS[fecha.getDay()];
  return `${dia[0].toUpperCase()}${dia.slice(1)} ${fecha.getDate()} de ${MESES[fecha.getMonth()]}`;
}

/** "Antes de marzo 2027" a partir de 2027-03-01 */
export function antesDe(fechaISO: string): string {
  const [anio, mes] = fechaISO.split("-").map(Number);
  return `Antes de ${MESES[mes - 1]} ${anio}`;
}
