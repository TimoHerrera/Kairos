import { describe, expect, it } from "vitest";
import { formatMonto, formatMontoCorto, formatNumero, formatPorcentaje, iniciales } from ".";

describe("cifras con formato argentino", () => {
  it("usa punto de miles y coma decimal", () => {
    expect(formatNumero(104412)).toBe("104.412");
    expect(formatNumero(1234567.5, 1)).toBe("1.234.567,5");
    expect(formatNumero(72)).toBe("72");
    expect(formatNumero(-8000)).toBe("-8.000");
  });

  it("formatea precios y expensas como en el prototipo", () => {
    expect(formatMonto(172000, "USD")).toBe("USD 172.000");
    expect(formatMonto(185000, "ARS")).toBe("$185.000");
  });

  it("acorta los montos para los chips", () => {
    expect(formatMontoCorto(180000, "USD")).toBe("USD 180 mil");
    expect(formatMontoCorto(1200000, "USD")).toBe("USD 1,2 M");
    expect(formatMontoCorto(172500, "USD")).toBe("USD 172.500");
  });

  it("redondea el porcentaje de encaje", () => {
    expect(formatPorcentaje(91.6)).toBe("92%");
  });
});

describe("iniciales", () => {
  it("toma nombre y apellido", () => {
    expect(iniciales("Martina Gómez")).toBe("MG");
    expect(iniciales("Lucía F.")).toBe("LF");
  });
  it("ignora la 'y' de las parejas", () => {
    expect(iniciales("Sofía y Pablo")).toBe("SP");
  });
  it("con un solo nombre usa dos letras", () => {
    expect(iniciales("Diego")).toBe("DI");
  });
});
