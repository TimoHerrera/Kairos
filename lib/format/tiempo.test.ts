import { describe, expect, it } from "vitest";
import { antesDe, fechaLarga, haceCuanto, saludo } from "./tiempo";

const ahora = new Date("2026-11-12T18:32:00-03:00");
const hace = (ms: number) => new Date(ahora.getTime() - ms);
const MIN = 60_000;
const DIA = 24 * 60 * MIN;

describe("haceCuanto", () => {
  it("habla como en el prototipo", () => {
    expect(haceCuanto(hace(20_000), ahora)).toBe("recién");
    expect(haceCuanto(hace(4 * MIN), ahora)).toBe("hace 4 min");
    expect(haceCuanto(hace(3 * 60 * MIN), ahora)).toBe("hace 3 h");
    expect(haceCuanto(hace(DIA), ahora)).toBe("hace 1 día");
    expect(haceCuanto(hace(12 * DIA), ahora)).toBe("hace 12 días");
    expect(haceCuanto(hace(98 * DIA), ahora)).toBe("hace 3 meses");
    expect(haceCuanto(hace(125 * DIA), ahora)).toBe("hace 4 meses");
    expect(haceCuanto(hace(30 * DIA), ahora)).toBe("hace 1 mes");
  });
});

describe("fechas", () => {
  it("saluda según la hora", () => {
    expect(saludo(new Date(2026, 10, 12, 9))).toBe("Buenos días");
    expect(saludo(new Date(2026, 10, 12, 18, 32))).toBe("Buenas tardes");
    expect(saludo(new Date(2026, 10, 12, 22))).toBe("Buenas noches");
  });
  it("escribe la fecha larga", () => {
    expect(fechaLarga(new Date(2026, 10, 12))).toBe("Jueves 12 de noviembre");
  });
  it("escribe la fecha de mudanza", () => {
    expect(antesDe("2027-03-01")).toBe("Antes de marzo 2027");
  });
});
