import { describe, expect, it } from "vitest";
import type { MatchWithRefs } from "@/lib/data/types";
import { buildDemoData } from "@/lib/data/seed/build";
import { enNoMolestar, textoAviso } from "./avisar";

const a = (h: number, m = 0) => new Date(2026, 10, 19, h, m);

describe("no molestar", () => {
  it("sin horario, siempre avisa", () => {
    expect(enNoMolestar({ dnd_start: null, dnd_end: null }, a(3))).toBe(false);
  });
  it("rango dentro del día", () => {
    const s = { dnd_start: "13:00", dnd_end: "15:00" };
    expect(enNoMolestar(s, a(14))).toBe(true);
    expect(enNoMolestar(s, a(15))).toBe(false);
    expect(enNoMolestar(s, a(12, 59))).toBe(false);
  });
  it("rango que cruza la medianoche", () => {
    const s = { dnd_start: "22:00", dnd_end: "08:00" };
    expect(enNoMolestar(s, a(23, 30))).toBe(true);
    expect(enNoMolestar(s, a(7, 59))).toBe(true);
    expect(enNoMolestar(s, a(8))).toBe(false);
    expect(enNoMolestar(s, a(18, 32))).toBe(false);
  });
});

describe("texto del aviso", () => {
  it("dice lo mismo que la pantalla 05", () => {
    let n = 0;
    const demo = buildDemoData("agente", () => `id-${++n}`);
    const m = demo.matches[0];
    const conRefs = {
      ...m,
      buyer: demo.buyers.find((b) => b.id === m.buyer_id)!,
      property: demo.properties.find((p) => p.id === m.property_id)!,
    } as MatchWithRefs;
    expect(textoAviso(conRefs)).toEqual({
      title: "Esta propiedad le sirve a Martina",
      body: "3 amb en Gorriti 4800, Palermo Soho · USD 172.000 · 92% de encaje",
      url: `/oportunidad/${m.id}`,
      tag: `oportunidad-${m.id}`,
    });
  });
});
