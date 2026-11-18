import { describe, expect, it } from "vitest";
import demo from "@/lib/data/seed/demo.json";
import { extraerConReglas } from "./reglas";

const ahora = new Date("2026-11-12T18:32:00-03:00");
const notaMartina = demo.buyers.find((b) => b.key === "martina")!.note!.transcript;

describe("extractor por reglas", () => {
  it("arma la ficha de Martina igual que el prototipo", () => {
    const n = extraerConReglas(notaMartina, ahora);
    expect(n.cliente.nombre).toBe("Martina");
    expect(n).toMatchObject({
      operacion: "buy",
      tipo: "apartment",
      ambientes_min: 3,
      ambientes_max: 3,
      barrio: "Palermo",
      moneda: "USD",
      presupuesto_max: 180000,
      financiacion: "preapproved_credit",
      mudanza_antes_de: "2027-03",
    });
    expect(n.le_importa).toEqual(["balcon", "luminoso"]);
    expect(n.no_quiere.sort()).toEqual(["planta_baja", "sobre_avenida"]);
    expect(n.descartes).toEqual([
      { propiedad: "Thames", motivo: "Es planta baja" },
      { propiedad: "Santa Fe", motivo: "Por el ruido" },
    ]);
  });

  it("entiende un cliente nuevo con teléfono, contado y fecha", () => {
    const n = extraerConReglas(
      "Recién vi a Juan Rodríguez, un cliente nuevo. Busca 2 ambientes en Belgrano, hasta 150 mil dólares, que tenga balcón. No quiere nada sobre avenida. Paga de contado y quiere mudarse antes de junio. Su celular es 11 5555 0110.",
      ahora,
    );
    expect(n).toMatchObject({
      cliente: { nombre: "Juan Rodríguez", telefono: "11 5555 0110" },
      ambientes_min: 2,
      barrio: "Belgrano",
      presupuesto_max: 150000,
      moneda: "USD",
      financiacion: "cash",
      mudanza_antes_de: "2027-06",
      le_importa: ["balcon"],
      no_quiere: ["sobre_avenida"],
    });
  });

  it("entiende una actualización: sube el tope y suma una característica", () => {
    const n = extraerConReglas("Hablé con Martina. Subió el tope a 185 mil y ahora también quiere cochera.", ahora);
    expect(n.cliente.nombre).toBe("Martina");
    expect(n.presupuesto_max).toBe(185000);
    expect(n.le_importa).toEqual(["cochera"]);
    expect(n.barrio).toBeNull();
    expect(n.descartes).toEqual([]);
  });

  it("subzonas, rangos, alquiler en pesos y lo opcional", () => {
    const n = extraerConReglas(
      "Hablé con Sofía y Pablo. Quieren alquilar un PH de 3 o 4 ambientes en Palermo Hollywood o Palermo Chico, hasta 900.000 pesos. Si tiene terraza, mejor: estaría bueno.",
      ahora,
    );
    expect(n.cliente.nombre).toBe("Sofía y Pablo");
    expect(n).toMatchObject({
      operacion: "rent",
      tipo: "ph",
      ambientes_min: 3,
      ambientes_max: 4,
      barrio: "Palermo",
      subzonas: ["Hollywood", "Chico"],
      presupuesto_max: 900000,
      moneda: "ARS",
    });
    expect(n.le_gustaria).toEqual(["terraza"]);
  });

  it("si no entiende nada, no inventa", () => {
    const n = extraerConReglas("Hoy llovió mucho y llegué tarde.", ahora);
    expect(n.cliente.nombre).toBeNull();
    expect(n.barrio).toBeNull();
    expect(n.presupuesto_max).toBeNull();
    expect(n.le_importa).toEqual([]);
  });
});
