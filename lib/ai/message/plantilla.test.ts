import { describe, expect, it } from "vitest";
import { alturaHablada, redactarConPlantilla } from "./plantilla";
import type { PedidoMensaje } from "./schema";

const gorriti: PedidoMensaje = {
  tono: "normal",
  fotos: false,
  nombre: "Martina",
  propiedad: {
    tipo: "apartment",
    ambientes: 3,
    direccion: "Gorriti 4800",
    zona: "Palermo Soho",
    piso: 4,
    balcon: true,
    luminoso: true,
    orientacion: "Norte",
    precio: "USD 172.000",
    url: "https://www.zonaprop.com.ar/propiedades/gorriti-4800.html",
  },
  evita: ["planta_baja", "sobre_avenida"],
};

describe("mensaje para el cliente", () => {
  it("normal: como el de la pantalla 07", () => {
    expect(redactarConPlantilla(gorriti)).toBe(
      "Hola Martina, acaba de entrar algo que encaja con lo que buscás: 3 ambientes en Gorriti al 4800, Palermo Soho. " +
        "Es un 4º piso con balcón, súper luminoso (orientación norte) y está en USD 172.000. " +
        "No es planta baja ni da a avenida. ¿Te gustaría verlo esta semana?",
    );
  });

  it("más corto", () => {
    expect(redactarConPlantilla({ ...gorriti, tono: "shorter" })).toBe(
      "Hola Martina! Entró un 3 ambientes en Gorriti al 4800, Palermo Soho: 4º piso, con balcón, luminoso, USD 172.000. ¿Lo querés ver esta semana?",
    );
  });

  it("más formal, de usted", () => {
    const t = redactarConPlantilla({ ...gorriti, tono: "formal" });
    expect(t).toMatch(/^Hola Martina, ¿cómo está\? Le escribo porque ingresó una propiedad/);
    expect(t).toContain("No es planta baja ni está sobre avenida.");
    expect(t).toContain("¿Le interesaría coordinar una visita");
    expect(t).not.toMatch(/\bbuscás\b|\bquerés\b/);
  });

  it("agregar fotos suma el link del aviso", () => {
    expect(redactarConPlantilla({ ...gorriti, fotos: true })).toMatch(
      /\n\nTe paso las fotos y todos los datos: https:\/\/www\.zonaprop\.com\.ar\/propiedades\/gorriti-4800\.html$/,
    );
    expect(redactarConPlantilla({ ...gorriti, fotos: true, propiedad: { ...gorriti.propiedad, url: null } })).not.toContain("fotos");
  });

  it("una casa en planta baja sin datos extra", () => {
    expect(
      redactarConPlantilla({
        ...gorriti,
        nombre: "Sofía",
        propiedad: { ...gorriti.propiedad, tipo: "house", ambientes: 5, direccion: "Echeverría 3600", zona: "Belgrano R", piso: null, balcon: false, luminoso: false, precio: "USD 410.000" },
        evita: ["sobre_avenida"],
      }),
    ).toBe(
      "Hola Sofía, acaba de entrar algo que encaja con lo que buscás: casa en Echeverría al 3600, Belgrano R. Está en USD 410.000. No da a avenida. ¿Te gustaría verlo esta semana?",
    );
  });

  it("habla de las alturas como en Buenos Aires", () => {
    expect(alturaHablada("Gorriti 4800")).toBe("Gorriti al 4800");
    expect(alturaHablada("Av. Santa Fe 3900")).toBe("Av. Santa Fe al 3900");
    expect(alturaHablada("Sin número")).toBe("Sin número");
  });
});
