import { createDecipheriv, createECDH, createPublicKey, hkdfSync, randomBytes, verify } from "node:crypto";
import { describe, expect, it } from "vitest";
import { b64url, cifrar, esServicioDePush, generarClavesVapid, jwtVapid } from "./webpush";

/** Un "navegador" de prueba: genera la suscripción y sabe descifrar como lo haría el teléfono. */
function navegador() {
  const ua = createECDH("prime256v1");
  ua.generateKeys();
  const auth = randomBytes(16);
  const suscripcion = {
    endpoint: "https://fcm.googleapis.com/fcm/send/abc",
    keys: { p256dh: b64url.codificar(ua.getPublicKey()), auth: b64url.codificar(auth) },
  };
  function descifrar(mensaje: Buffer): string {
    const sal = mensaje.subarray(0, 16);
    const largoClave = mensaje[20];
    const asPublica = mensaje.subarray(21, 21 + largoClave);
    const cifrado = mensaje.subarray(21 + largoClave);
    const secreto = ua.computeSecret(asPublica);
    const info = Buffer.concat([Buffer.from("WebPush: info\0"), ua.getPublicKey(), asPublica]);
    const ikm = Buffer.from(hkdfSync("sha256", secreto, auth, info, 32));
    const cek = Buffer.from(hkdfSync("sha256", ikm, sal, Buffer.from("Content-Encoding: aes128gcm\0"), 16));
    const nonce = Buffer.from(hkdfSync("sha256", ikm, sal, Buffer.from("Content-Encoding: nonce\0"), 12));
    const d = createDecipheriv("aes-128-gcm", cek, nonce);
    d.setAuthTag(cifrado.subarray(cifrado.length - 16));
    const plano = Buffer.concat([d.update(cifrado.subarray(0, cifrado.length - 16)), d.final()]);
    expect(plano.at(-1)).toBe(2); // delimitador del último registro
    return plano.subarray(0, -1).toString();
  }
  return { suscripcion, descifrar };
}

describe("cifrado aes128gcm", () => {
  it("el teléfono puede descifrar lo que mandamos", () => {
    const { suscripcion, descifrar } = navegador();
    const contenido = JSON.stringify({ title: "Esta propiedad le sirve a Martina", url: "/oportunidad/1" });
    const mensaje = cifrar(Buffer.from(contenido), suscripcion);
    expect(mensaje.readUInt32BE(16)).toBe(4096);
    expect(mensaje[20]).toBe(65);
    expect(descifrar(mensaje)).toBe(contenido);
  });

  it("cada envío usa sal y clave nuevas", () => {
    const { suscripcion } = navegador();
    const a = cifrar(Buffer.from("hola"), suscripcion);
    const b = cifrar(Buffer.from("hola"), suscripcion);
    expect(a.equals(b)).toBe(false);
  });

  it("rechaza suscripciones con claves inválidas", () => {
    expect(() => cifrar(Buffer.from("x"), { endpoint: "https://fcm.googleapis.com/x", keys: { p256dh: "abc", auth: "abc" } })).toThrow();
  });
});

describe("VAPID", () => {
  it("firma un JWT ES256 que se verifica con la clave pública", () => {
    const claves = { ...generarClavesVapid(), sujeto: "mailto:demo@kairos.app" };
    const jwt = jwtVapid("https://fcm.googleapis.com/fcm/send/abc", claves, new Date("2026-11-19T12:00:00Z"));
    const [h, d, f] = jwt.split(".");
    expect(JSON.parse(b64url.decodificar(h).toString())).toEqual({ typ: "JWT", alg: "ES256" });
    expect(JSON.parse(b64url.decodificar(d).toString())).toEqual({
      aud: "https://fcm.googleapis.com",
      exp: Math.floor(new Date("2026-11-19T12:00:00Z").getTime() / 1000) + 12 * 3600,
      sub: "mailto:demo@kairos.app",
    });
    const publica = b64url.decodificar(claves.publica);
    const clave = createPublicKey({
      key: { kty: "EC", crv: "P-256", x: b64url.codificar(publica.subarray(1, 33)), y: b64url.codificar(publica.subarray(33)) },
      format: "jwk",
    });
    expect(verify("sha256", Buffer.from(`${h}.${d}`), { key: clave, dsaEncoding: "ieee-p1363" }, b64url.decodificar(f))).toBe(true);
  });
});

describe("solo servicios de push conocidos", () => {
  it.each([
    ["https://fcm.googleapis.com/fcm/send/abc", true],
    ["https://updates.push.services.mozilla.com/wpush/v2/abc", true],
    ["https://web.push.apple.com/abc", true],
    ["https://wns2-bl2p.notify.windows.com/w/?token=abc", true],
    ["http://fcm.googleapis.com/fcm/send/abc", false],
    ["https://evil.example.com/googleapis.com", false],
    ["no es una url", false],
  ])("%s → %s", (endpoint, esperado) => {
    expect(esServicioDePush(endpoint)).toBe(esperado);
  });
});
