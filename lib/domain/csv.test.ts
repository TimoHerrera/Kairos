import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { filasAPropiedades, parsearCsv } from "./csv";

describe("parsear CSV", () => {
  it("detecta punto y coma y respeta comillas", () => {
    expect(parsearCsv('a;b;c\n"Gorriti 4800; PB";"dice ""hola""";3\n')).toEqual([
      ["a", "b", "c"],
      ["Gorriti 4800; PB", 'dice "hola"', "3"],
    ]);
  });
  it("también coma, saltos de Windows y BOM", () => {
    expect(parsearCsv("﻿a,b\r\n1,2\r\n\r\n")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });
});

describe("importar la plantilla", () => {
  it("la plantilla de ejemplo importa entera", () => {
    const csv = readFileSync("public/plantillas/propiedades.csv", "utf8");
    const { filas, faltanColumnas } = filasAPropiedades(parsearCsv(csv));
    expect(faltanColumnas).toEqual([]);
    expect(filas.map((f) => f.ok)).toEqual([true, true, true]);
    const [thames, corrientes, zabala] = filas.map((f) => (f.ok ? f.propiedad : null));
    expect(thames).toMatchObject({ address: "Thames 2100", subzone: "Soho", price: 189000, floor: 3, balcony: true, amenities: ["luminoso", "ascensor"], source: "imported" });
    expect(corrientes).toMatchObject({ address: "Av. Corrientes 4800", on_avenue: true, credit_eligible: "yes", subzone: null });
    expect(zabala).toMatchObject({ operation: "rent", property_type: "ph", currency: "ARS", price: 850000, floor: 0, credit_eligible: "no" });
  });

  it("marca los errores con el número de fila de la planilla", () => {
    const { filas } = filasAPropiedades(
      parsearCsv("direccion;barrio;precio;ambientes;tipo\nGorriti 4800;Palermo;172.000;3;departamento\n;Palermo;abc;;quincho\n"),
    );
    expect(filas[0]).toMatchObject({ numero: 2, ok: true, propiedad: { price: 172000 } });
    expect(filas[1].ok).toBe(false);
    expect(filas[1].numero).toBe(3);
    if (!filas[1].ok) expect(filas[1].errores.length).toBeGreaterThanOrEqual(3);
  });

  it("avisa si faltan columnas obligatorias", () => {
    expect(filasAPropiedades(parsearCsv("calle;precio\nGorriti;1")).faltanColumnas).toEqual(["direccion", "barrio", "ambientes"]);
  });
});
