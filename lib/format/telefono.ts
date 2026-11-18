/**
 * Teléfonos argentinos en el formato que usa WhatsApp: 549 + código de área + número, sin 0 ni 15.
 * "11 5555-0101", "011 15 5555 0101" y "+54 9 11 5555 0101" dan todos 5491155550101.
 * Devuelve null si no parece un celular argentino válido.
 */
export function normalizarTelefono(entrada: string): string | null {
  let d = entrada.replace(/\D/g, "");
  if (!d) return null;
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("54")) d = d.slice(2);
  if (d.startsWith("9") && d.length === 11) d = d.slice(1);
  if (d.startsWith("0")) d = d.slice(1);

  // Código de área (2 a 4 dígitos) + 15 + número: el 15 sobra.
  if (d.length === 12) {
    for (const largo of [2, 3, 4]) {
      if (d.slice(largo, largo + 2) === "15") {
        d = d.slice(0, largo) + d.slice(largo + 2);
        break;
      }
    }
  }
  if (d.length !== 10) return null;
  return `549${d}`;
}

/** 5491155550101 → "+54 9 11 5555-0101" */
export function formatTelefono(telefono: string): string {
  const m = /^549(\d{10})$/.exec(telefono);
  if (!m) return telefono.startsWith("+") ? telefono : `+${telefono}`;
  const n = m[1];
  // Buenos Aires usa código de 2 dígitos; para el resto asumimos 3.
  const area = n.startsWith("11") ? 2 : 3;
  const resto = n.slice(area);
  return `+54 9 ${n.slice(0, area)} ${resto.slice(0, resto.length - 4)}-${resto.slice(-4)}`;
}

export function linkWhatsApp(telefono: string, texto?: string): string {
  return `https://wa.me/${telefono}${texto ? `?text=${encodeURIComponent(texto)}` : ""}`;
}
