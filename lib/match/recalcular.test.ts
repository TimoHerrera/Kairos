import { describe, expect, it } from "vitest";
import { createMockDataSource, memoryStorage } from "@/lib/data/mock";
import { recalcularOportunidades } from "./recalcular";

async function demo() {
  let n = 0;
  const ds = createMockDataSource({
    storage: memoryStorage(),
    newId: () => `id-${++n}`,
    now: () => new Date("2026-11-12T18:32:00-03:00"),
  });
  await ds.auth.signInDemo();
  return ds;
}

const nuevaPropiedad = {
  source: "manual" as const,
  url: null,
  portal: null,
  operation: "buy" as const,
  property_type: "apartment" as const,
  address: "Fitz Roy 1800",
  neighborhood: "Palermo",
  subzone: "Hollywood",
  price: 175000,
  currency: "USD" as const,
  expenses: 160000,
  rooms: 3,
  bedrooms: 2,
  covered_m2: 70,
  total_m2: 74,
  floor: 6,
  orientation: "Norte",
  balcony: true,
  on_avenue: false,
  credit_eligible: "yes" as const,
  amenities: ["luminoso"],
  photos: [],
  description: null,
};

describe("recalcular oportunidades", () => {
  it("al cargar una propiedad que le sirve a Martina, crea la oportunidad nueva", async () => {
    const ds = await demo();
    const p = await ds.properties.create(nuevaPropiedad);
    const r = await recalcularOportunidades(ds, { propiedadIds: [p.id] });
    expect(r.nuevas.map((m) => m.buyer.name)).toEqual(["Martina Gómez"]);
    expect(r.nuevas[0]).toMatchObject({ status: "new", property_id: p.id });
    expect(r.nuevas[0].score).toBeGreaterThanOrEqual(90);
    expect(r.nuevas[0].reasons.total).toBe(7);
  });

  it("no duplica: recalcular otra vez actualiza", async () => {
    const ds = await demo();
    const p = await ds.properties.create(nuevaPropiedad);
    await recalcularOportunidades(ds, { propiedadIds: [p.id] });
    const otra = await recalcularOportunidades(ds, { propiedadIds: [p.id] });
    expect(otra.nuevas).toEqual([]);
    expect(otra.actualizadas).toBe(1);
    expect(await ds.matches.list({ propertyId: p.id })).toHaveLength(1);
  });

  it("si la ficha cambia y ya no encaja, la borra; si ya se mandó, la deja", async () => {
    const ds = await demo();
    const p = await ds.properties.create(nuevaPropiedad);
    const { nuevas } = await recalcularOportunidades(ds, { propiedadIds: [p.id] });
    const martina = nuevas[0].buyer;

    // Martina baja el tope: Fitz Roy ya no le sirve, y tampoco Gorriti (172.000)…
    await ds.buyers.updateCriteria(martina.id, { budget_max: 170000 });
    const r = await recalcularOportunidades(ds, { clienteIds: [martina.id] });
    expect(r.borradas).toBe(1);
    expect(await ds.matches.list({ propertyId: p.id })).toEqual([]);
    // …pero Gorriti ya se le había mandado: queda en su historial.
    const deMartina = await ds.matches.list({ buyerId: martina.id });
    expect(deMartina.map((m) => [m.property.address, m.status])).toEqual([["Gorriti 4800", "sent"]]);
  });

  it("respeta el umbral de alerta del agente", async () => {
    const ds = await demo();
    await ds.agent.updateSettings({ alert_threshold: 99 });
    const p = await ds.properties.create(nuevaPropiedad);
    expect((await recalcularOportunidades(ds, { propiedadIds: [p.id] })).nuevas).toEqual([]);
  });

  it("un cliente sin ficha no recibe oportunidades", async () => {
    const ds = await demo();
    const juan = await ds.buyers.create({ name: "Juan Sin Ficha" });
    expect((await recalcularOportunidades(ds, { clienteIds: [juan.id] })).nuevas).toEqual([]);
  });

  it("los estados: visto, enviado y descartado", async () => {
    const ds = await demo();
    const p = await ds.properties.create(nuevaPropiedad);
    const { nuevas } = await recalcularOportunidades(ds, { propiedadIds: [p.id] });
    await ds.matches.setStatus(nuevas[0].id, "seen");
    const enviada = await ds.matches.setStatus(nuevas[0].id, "sent");
    expect(enviada.sent_at).toBe("2026-11-12T21:32:00.000Z");
    expect((await ds.matches.get(nuevas[0].id))?.property.address).toBe("Fitz Roy 1800");
  });
});
