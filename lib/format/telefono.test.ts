import { describe, expect, it } from "vitest";
import { formatTelefono, linkWhatsApp, normalizarTelefono } from "./telefono";

describe("normalizarTelefono", () => {
  it("lleva las formas habituales a 549…", () => {
    for (const entrada of [
      "11 5555-0101",
      "011 5555 0101",
      "011 15 5555 0101",
      "15 5555 0101".replace("15", "11 15"),
      "+54 9 11 5555 0101",
      "54 11 5555 0101",
      "5491155550101",
    ]) {
      expect(normalizarTelefono(entrada), entrada).toBe("5491155550101");
    }
  });

  it("acepta códigos de área del interior", () => {
    expect(normalizarTelefono("0351 15 555 0101")).toBe("5493515550101");
    expect(normalizarTelefono("+54 9 2944 55 0101")).toBe("5492944550101");
  });

  it("rechaza lo que no es un celular válido", () => {
    expect(normalizarTelefono("5555 0101")).toBeNull();
    expect(normalizarTelefono("hola")).toBeNull();
    expect(normalizarTelefono("")).toBeNull();
  });
});

describe("mostrar y abrir", () => {
  it("formatea para leer", () => {
    expect(formatTelefono("5491155550101")).toBe("+54 9 11 5555-0101");
    expect(formatTelefono("5493515550101")).toBe("+54 9 351 555-0101");
  });
  it("arma el link de WhatsApp con el texto codificado", () => {
    expect(linkWhatsApp("5491155550101")).toBe("https://wa.me/5491155550101");
    expect(linkWhatsApp("5491155550101", "Hola Martina, ¿cómo estás?")).toBe(
      "https://wa.me/5491155550101?text=Hola%20Martina%2C%20%C2%BFc%C3%B3mo%20est%C3%A1s%3F",
    );
  });
});
