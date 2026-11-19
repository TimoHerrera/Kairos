import { describe, expect, it } from "vitest";
import type { BuyerCriteria, DiscardWithProperty, Property } from "@/lib/data/types";
import { buildDemoData } from "@/lib/data/seed/build";
import { calificacion, evaluar, filtrar } from "./motor";

let n = 0;
const demo = buildDemoData("agente", () => `id-${++n}`, new Date("2026-11-12T18:32:00-03:00"));
const cliente = (nombre: string) => demo.buyers.find((b) => b.name.startsWith(nombre))!;
const ficha = (nombre: string): BuyerCriteria => demo.buyer_criteria.find((c) => c.buyer_id === cliente(nombre).id)!;
const prop = (direccion: string): Property => demo.properties.find((p) => p.address === direccion)!;
const descartes = (nombre: string): DiscardWithProperty[] =>
  demo.discards
    .filter((d) => d.buyer_id === cliente(nombre).id)
    .map((d) => ({ ...d, property: demo.properties.find((p) => p.id === d.property_id) ?? null }));

describe("el caso Martina", () => {
  const martina = ficha("Martina");
  const suyos = descartes("Martina");

  it("Gorriti 4800 encaja alrededor de 92% y cumple 6 de las 7 cosas", () => {
    const r = evaluar(martina, prop("Gorriti 4800"), suyos);
    if (!r.encaja) throw new Error(r.motivo);
    expect(r.score).toBeGreaterThanOrEqual(90);
    expect(r.score).toBeLessThanOrEqual(94);
    expect([r.cumple, r.total]).toEqual([6, 7]);
    expect(r.reasons.met).toEqual([
      "3 ambientes en Palermo Soho",
      "USD 172.000 — USD 8.000 por debajo de su tope",
      "Tiene balcón",
      "Orientación norte, muy luminoso",
      "4º piso, no es planta baja",
      "Calle tranquila, no es avenida",
    ]);
    expect(r.reasons.unconfirmed).toEqual(["Apto crédito: a confirmar con el propietario"]);
    expect(r.reasons.unmet).toEqual([]);
    expect(r.reasons.discard_note).toBe("No se parece a lo que descartó: evitamos plantas bajas y avenidas.");
    expect(r.similar_to_discard).toBe(false);
    expect(calificacion(r.score)).toBe("Encaja muy bien");
  });

  it("Av. Santa Fe 3900 queda excluida: ya la descartó, y además da a la avenida", () => {
    expect(evaluar(martina, prop("Av. Santa Fe 3900"), suyos)).toEqual({ encaja: false, motivo: "Ya la descartó" });
    expect(filtrar(martina, prop("Av. Santa Fe 3900"), [])).toBe("Sobre avenida: no quiere");
  });

  it("Thames 1700 PB queda excluida por planta baja", () => {
    expect(filtrar(martina, prop("Thames 1700"), [])).toBe("Planta baja: no quiere");
  });

  it("se pasa del tope: excluida", () => {
    expect(filtrar(martina, prop("Honduras 5200"), [])).toBe("Se pasa de su tope (USD 180.000)");
  });
});

describe("filtros duros", () => {
  const martina = ficha("Martina");

  it("ambientes fuera de rango", () => {
    expect(filtrar(martina, prop("El Salvador 4600"), [])).toBe("Tiene 2 ambientes y busca 3 o más");
  });
  it("otro tipo de propiedad", () => {
    expect(filtrar(ficha("Sofía"), prop("Juramento 3200"), [])).toBe("Busca otro tipo de propiedad");
  });
  it("otro barrio que no es limítrofe", () => {
    expect(filtrar(ficha("Diego"), prop("Rojas 400"), [], { limitrofes: false })).toBe("Está en Caballito y busca en Villa Crespo");
  });
  it("lo que no quiere, aunque sea una amenity", () => {
    expect(filtrar(ficha("Diego"), prop("Malabia 900"), [])).toBe("A refaccionar: no quiere");
  });
  it("alquiler contra compra", () => {
    expect(filtrar(martina, { ...prop("Gorriti 4800"), operation: "rent" }, [])).toBe("Busca comprar");
  });
});

describe("puntaje y explicación", () => {
  it("un barrio limítrofe encaja con penalización y queda a confirmar", () => {
    const r = evaluar(ficha("Diego"), prop("Rojas 400"), []);
    if (!r.encaja) throw new Error(r.motivo);
    expect(r.reasons.unconfirmed[0]).toBe("2 ambientes en Caballito, limítrofe con Villa Crespo");
    const mismo = evaluar(ficha("Diego"), prop("Acevedo 500"), []);
    if (!mismo.encaja) throw new Error(mismo.motivo);
    expect(r.score).toBeLessThan(mismo.score);
  });

  it("Diego y Acevedo 500: encaja bien, con el extra de balcón", () => {
    const r = evaluar(ficha("Diego"), prop("Acevedo 500"), []);
    if (!r.encaja) throw new Error(r.motivo);
    expect(r.score).toBeGreaterThanOrEqual(85);
    expect(r.reasons.met).toContain("Además, tiene balcón");
  });

  it("más barato, más puntaje", () => {
    const martina = ficha("Martina");
    const base = prop("Gorriti 4800");
    const caro = evaluar(martina, { ...base, price: 180000 }, []);
    const barato = evaluar(martina, { ...base, price: 150000 }, []);
    if (!caro.encaja || !barato.encaja) throw new Error("debería encajar");
    expect(barato.score).toBeGreaterThan(caro.score);
    expect(caro.reasons.met[1]).toBe("USD 180.000, justo su tope");
  });

  it("si se parece a lo que descartó, baja el puntaje y lo dice", () => {
    const martina = ficha("Martina");
    const thames = prop("Thames 1700");
    const vecina = { ...prop("Gorriti 4800"), id: "otra", address: "Thames 1900" };
    const sin = evaluar(martina, prop("Gorriti 4800"), []);
    const con = evaluar(martina, vecina, [
      { id: "d", agent_id: "agente", buyer_id: "b", property_id: thames.id, property_text: null, reason: "Es planta baja", created_at: "", property: thames },
    ]);
    if (!sin.encaja || !con.encaja) throw new Error("debería encajar");
    expect(con.similar_to_discard).toBe(true);
    expect(con.score).toBe(sin.score - 15);
    expect(con.reasons.discard_note).toBe("Se parece a Thames 1700, que descartó: “Es planta baja”.");
  });

  it("un pedido con sus palabras queda a confirmar, no como un no", () => {
    const r = evaluar({ ...ficha("Martina"), must_haves: ["Cerca del subte"] }, prop("Gorriti 4800"), []);
    if (!r.encaja) throw new Error(r.motivo);
    expect(r.reasons.unconfirmed).toContain("Cerca del subte: a confirmar");
    expect(r.reasons.unmet).toEqual([]);
  });
});
