import { describe, expect, it } from "vitest";
import { leerAvisoConReglas } from "./reglas";

const GORRITI = `Departamento en Venta en Palermo Soho
Gorriti 4800, Palermo Soho, Capital Federal
USD 172.000
Expensas $185.000
3 ambientes · 2 dormitorios · 72 m² cubiertos · 78 m² totales
4º piso, balcón al frente, orientación norte. Muy luminoso, sobre calle tranquila.
Edificio con ascensor.`;

describe("leer un aviso pegado", () => {
  it("saca los datos del aviso de Gorriti 4800", () => {
    const a = leerAvisoConReglas(GORRITI, "https://www.zonaprop.com.ar/propiedades/gorriti-4800.html");
    expect(a).toMatchObject({
      direccion: "Gorriti 4800",
      barrio: "Palermo",
      subzona: "Soho",
      operacion: "buy",
      tipo: "apartment",
      precio: 172000,
      moneda: "USD",
      expensas: 185000,
      ambientes: 3,
      dormitorios: 2,
      m2_cubiertos: 72,
      m2_totales: 78,
      piso: 4,
      orientacion: "Norte",
      balcon: true,
      sobre_avenida: false,
      apto_credito: "unconfirmed",
    });
    expect(a.amenities).toEqual(expect.arrayContaining(["luminoso", "silencioso", "ascensor"]));
    expect(a.dudas).toEqual(["apto_credito"]);
  });

  it("reconoce avenida, planta baja y apto crédito", () => {
    const a = leerAvisoConReglas(
      "PH en venta. Av. Rivadavia 5100, Caballito. U$S 142.000. Expensas: $ 15.000. 3 amb. Planta baja con patio. Apto crédito.",
    );
    expect(a).toMatchObject({
      direccion: "Av. Rivadavia 5100",
      barrio: "Caballito",
      tipo: "ph",
      precio: 142000,
      expensas: 15000,
      ambientes: 3,
      piso: 0,
      sobre_avenida: true,
      apto_credito: "yes",
    });
    expect(a.amenities).toContain("patio");
  });

  it("alquiler en pesos sin confundir el precio con las expensas", () => {
    const a = leerAvisoConReglas("Alquiler 2 ambientes en Villa Crespo, Malabia 900. Expensas $70.000. Precio $650.000 por mes. Sin balcón.");
    expect(a).toMatchObject({
      operacion: "rent",
      precio: 650000,
      moneda: "ARS",
      expensas: 70000,
      ambientes: 2,
      direccion: "Malabia 900",
      balcon: false,
    });
  });

  it("lo que no encuentra queda en dudas", () => {
    const a = leerAvisoConReglas("Hermoso departamento, consultar precio. Muy buena ubicación.");
    expect(a.precio).toBeNull();
    expect(a.direccion).toBeNull();
    expect(a.dudas).toEqual(expect.arrayContaining(["direccion", "barrio", "precio", "ambientes"]));
  });
});

describe("dirección", () => {
  it("no pega el final de la oración anterior", () => {
    const a = leerAvisoConReglas("Departamento en venta en Palermo Hollywood. Fitz Roy 1800. USD 179.000. 3 ambientes.");
    expect(a.direccion).toBe("Fitz Roy 1800");
    expect(a.subzona).toBe("Hollywood");
  });
  it("respeta abreviaturas", () => {
    expect(leerAvisoConReglas("Venta. Av. Cabildo 2300, Belgrano. USD 185.000. 3 amb.").direccion).toBe("Av. Cabildo 2300");
    expect(leerAvisoConReglas("Venta. Gral. Paz 1200, Saavedra. USD 99.000. 2 amb.").direccion).toBe("Gral. Paz 1200");
  });
});
