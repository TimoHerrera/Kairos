import { describe, expect, it } from "vitest";
import { resumenDeFicha } from "./resumen";

const base = {
  operation: "buy" as const,
  property_type: null,
  rooms_min: null,
  rooms_max: null,
  neighborhood: null,
  subzones: [] as string[],
  currency: "USD" as const,
  budget_max: null,
};

describe("frase resumen de la ficha", () => {
  it("arma la de Martina igual que el prototipo", () => {
    expect(
      resumenDeFicha(
        {
          ...base,
          property_type: "apartment",
          rooms_min: 3,
          rooms_max: 3,
          neighborhood: "Palermo",
          subzones: ["Soho", "Hollywood", "Chico"],
          budget_max: 180000,
        },
        "Martina Gómez",
      ),
    ).toBe("Busca 3 ambientes en Palermo, hasta USD 180.000");
  });

  it("habla en plural para una pareja y usa la subzona si nombra al barrio", () => {
    expect(
      resumenDeFicha(
        { ...base, property_type: "house", rooms_min: 4, rooms_max: 6, neighborhood: "Belgrano", subzones: ["Belgrano R"], budget_max: 420000 },
        "Sofía y Pablo",
      ),
    ).toBe("Buscan una casa en Belgrano R, hasta USD 420.000");
  });

  it("refleja un cambio de tope", () => {
    expect(
      resumenDeFicha({ ...base, property_type: "apartment", rooms_min: 3, rooms_max: 3, neighborhood: "Palermo", budget_max: 185000 }, "Martina"),
    ).toBe("Busca 3 ambientes en Palermo, hasta USD 185.000");
  });

  it("cubre rangos, PH, alquiler y pesos", () => {
    expect(resumenDeFicha({ ...base, property_type: "apartment", rooms_min: 2, rooms_max: 3 }, "Ana")).toBe(
      "Busca de 2 a 3 ambientes",
    );
    expect(resumenDeFicha({ ...base, property_type: "ph", rooms_min: 3, rooms_max: 4, neighborhood: "Colegiales" }, "Carla")).toBe(
      "Busca un PH de 3 a 4 ambientes en Colegiales",
    );
    expect(
      resumenDeFicha({ ...base, operation: "rent", rooms_min: 1, rooms_max: 1, currency: "ARS", budget_max: 650000 }, "Juan"),
    ).toBe("Busca alquilar 1 ambiente, hasta $650.000");
  });

  it("con solo zona o solo tope igual dice algo", () => {
    expect(resumenDeFicha({ ...base, neighborhood: "Caballito" }, "Andrés")).toBe("Busca una propiedad en Caballito");
    expect(resumenDeFicha({ ...base, budget_max: 100000 }, "Andrés")).toBe("Busca una propiedad, hasta USD 100.000");
  });

  it("si no se sabe nada, no inventa", () => {
    expect(resumenDeFicha(base, "Andrés")).toBeNull();
  });
});
