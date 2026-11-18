import { describe, expect, it } from "vitest";
import type { Property } from "@/lib/data/types";
import { buscarPropiedad, claveCaracteristica, combinarNota, FICHA_VACIA } from "./combinar";
import { NOTA_VACIA, type NotaExtraida } from "./schema";

const nota = (parcial: Partial<NotaExtraida>): NotaExtraida => ({ ...structuredClone(NOTA_VACIA), ...parcial });

const fichaMartina = {
  ...FICHA_VACIA,
  property_type: "apartment" as const,
  rooms_min: 3,
  rooms_max: 3,
  neighborhood: "Palermo",
  subzones: ["Soho", "Hollywood", "Chico"],
  budget_max: 180000,
  financing: "preapproved_credit" as const,
  move_by: "2027-03-01",
  must_haves: ["balcon", "luminoso"],
  deal_breakers: ["planta_baja", "sobre_avenida"],
};

describe("combinar una nota con la ficha", () => {
  it("una nota nueva actualiza sin pisar: sube el tope y suma cochera", () => {
    const { cambios, frases } = combinarNota(
      fichaMartina,
      nota({ presupuesto_max: 185000, moneda: "USD", le_importa: ["cochera"] }),
    );
    expect(cambios).toEqual({ budget_max: 185000, must_haves: ["balcon", "luminoso", "cochera"] });
    expect(frases).toEqual(["Subió el tope a USD 185.000", "Le importa: cochera"]);
  });

  it("repetir lo que ya está no cambia nada", () => {
    const { cambios, frases } = combinarNota(
      fichaMartina,
      nota({
        barrio: "palermo",
        subzonas: ["Soho"],
        ambientes_min: 3,
        ambientes_max: 3,
        presupuesto_max: 180000,
        le_importa: ["Balcón"],
        no_quiere: ["planta baja"],
      }),
    );
    expect(cambios).toEqual({});
    expect(frases).toEqual([]);
  });

  it("arma una ficha nueva y lo cuenta", () => {
    const { cambios, frases } = combinarNota(
      FICHA_VACIA,
      nota({
        operacion: "buy",
        tipo: "apartment",
        ambientes_min: 2,
        ambientes_max: 2,
        barrio: "Belgrano",
        presupuesto_max: 150000,
        moneda: "USD",
        financiacion: "cash",
        mudanza_antes_de: "2027-06",
        le_importa: ["balcon"],
        no_quiere: ["sobre_avenida"],
      }),
    );
    expect(cambios).toMatchObject({
      property_type: "apartment",
      rooms_min: 2,
      neighborhood: "Belgrano",
      budget_max: 150000,
      financing: "cash",
      move_by: "2027-06-01",
      must_haves: ["balcon"],
      deal_breakers: ["sobre_avenida"],
    });
    expect(frases).toEqual([
      "Busca 2 ambientes",
      "Zona: Belgrano",
      "Tope: USD 150.000",
      "Financiación: contado",
      "Quiere mudarse antes de junio 2027",
      "Le importa: balcón",
      "No quiere: sobre avenida",
    ]);
  });

  it("si algo pasa a 'no quiere', sale de 'le importa'", () => {
    const { cambios, frases } = combinarNota(fichaMartina, nota({ no_quiere: ["luminoso"] }));
    expect(cambios.must_haves).toEqual(["balcon"]);
    expect(cambios.deal_breakers).toEqual(["planta_baja", "sobre_avenida", "luminoso"]);
    expect(frases).toEqual(["No quiere: luminoso"]);
  });

  it("cambiar de barrio limpia las subzonas viejas", () => {
    const { cambios, frases } = combinarNota(fichaMartina, nota({ barrio: "Villa Crespo" }));
    expect(cambios).toEqual({ neighborhood: "Villa Crespo", subzones: [] });
    expect(frases).toEqual(["Ahora busca en Villa Crespo (antes Palermo)"]);
  });

  it("baja el tope", () => {
    expect(combinarNota(fichaMartina, nota({ presupuesto_max: 170000 })).frases).toEqual(["Bajó el tope a USD 170.000"]);
  });
});

describe("características", () => {
  it("lleva las etiquetas a su clave", () => {
    expect(claveCaracteristica("Balcón")).toBe("balcon");
    expect(claveCaracteristica("planta baja")).toBe("planta_baja");
    expect(claveCaracteristica("Sobre avenida")).toBe("sobre_avenida");
    expect(claveCaracteristica("Cerca del subte")).toBe("Cerca del subte");
  });
});

describe("buscar la propiedad nombrada", () => {
  const prop = (address: string) => ({ id: address, address }) as Property;
  const propiedades = [prop("Thames 1700"), prop("Av. Santa Fe 3900"), prop("Gorriti 4800"), prop("Gorriti 5200")];

  it("encuentra por calle", () => {
    expect(buscarPropiedad("Thames", propiedades)?.address).toBe("Thames 1700");
    expect(buscarPropiedad("el de Santa Fe", propiedades)?.address).toBe("Av. Santa Fe 3900");
  });
  it("con dos en la misma calle, necesita el número", () => {
    expect(buscarPropiedad("Gorriti", propiedades)).toBeNull();
    expect(buscarPropiedad("Gorriti 4800", propiedades)?.address).toBe("Gorriti 4800");
  });
  it("si no está cargada, no inventa", () => {
    expect(buscarPropiedad("Malabia", propiedades)).toBeNull();
  });
});
