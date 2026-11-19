import { createECDH, createPrivateKey, hkdfSync, randomBytes, sign, createCipheriv } from "node:crypto";

/**
 * Web Push sin dependencias: firma VAPID (RFC 8292) y cifrado aes128gcm (RFC 8291 / 8188)
 * con el crypto de Node. Corre solo en el servidor.
 */

export type SuscripcionPush = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

export type ClavesVapid = {
  /** Clave pública sin comprimir (65 bytes) en base64url. */
  publica: string;
  /** Clave privada (32 bytes) en base64url. */
  privada: string;
  /** mailto: o https: de contacto. */
  sujeto: string;
};

export const b64url = {
  codificar: (b: Buffer | Uint8Array) => Buffer.from(b).toString("base64url"),
  decodificar: (s: string) => Buffer.from(s, "base64url"),
};

/** Genera un par de claves VAPID nuevo. */
export function generarClavesVapid(): { publica: string; privada: string } {
  const ecdh = createECDH("prime256v1");
  ecdh.generateKeys();
  return { publica: b64url.codificar(ecdh.getPublicKey()), privada: b64url.codificar(ecdh.getPrivateKey()) };
}

/** JWT de VAPID (ES256) para el origen del servicio de push. */
export function jwtVapid(endpoint: string, claves: ClavesVapid, ahora: Date = new Date()): string {
  const publica = b64url.decodificar(claves.publica);
  if (publica.length !== 65 || publica[0] !== 4) throw new Error("La clave pública VAPID no es válida.");
  const clave = createPrivateKey({
    key: {
      kty: "EC",
      crv: "P-256",
      d: claves.privada,
      x: b64url.codificar(publica.subarray(1, 33)),
      y: b64url.codificar(publica.subarray(33, 65)),
    },
    format: "jwk",
  });
  const encabezado = b64url.codificar(Buffer.from(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const datos = b64url.codificar(
    Buffer.from(
      JSON.stringify({
        aud: new URL(endpoint).origin,
        exp: Math.floor(ahora.getTime() / 1000) + 12 * 3600,
        sub: claves.sujeto,
      }),
    ),
  );
  const firma = sign("sha256", Buffer.from(`${encabezado}.${datos}`), { key: clave, dsaEncoding: "ieee-p1363" });
  return `${encabezado}.${datos}.${b64url.codificar(firma)}`;
}

/**
 * Cifra el contenido para una suscripción (aes128gcm, un solo registro).
 * `efimera` y `sal` se pueden fijar para los tests; en uso normal son aleatorias.
 */
export function cifrar(
  contenido: Buffer,
  suscripcion: SuscripcionPush,
  pruebas?: { efimera?: ReturnType<typeof createECDH>; sal?: Buffer },
): Buffer {
  const uaPublica = b64url.decodificar(suscripcion.keys.p256dh);
  const auth = b64url.decodificar(suscripcion.keys.auth);
  if (uaPublica.length !== 65 || auth.length !== 16) throw new Error("La suscripción no tiene claves válidas.");

  const efimera = pruebas?.efimera ?? createECDH("prime256v1");
  if (!pruebas?.efimera) efimera.generateKeys();
  const asPublica = efimera.getPublicKey();
  const secreto = efimera.computeSecret(uaPublica);

  const infoClave = Buffer.concat([Buffer.from("WebPush: info\0"), uaPublica, asPublica]);
  const ikm = Buffer.from(hkdfSync("sha256", secreto, auth, infoClave, 32));
  const sal = pruebas?.sal ?? randomBytes(16);
  const cek = Buffer.from(hkdfSync("sha256", ikm, sal, Buffer.from("Content-Encoding: aes128gcm\0"), 16));
  const nonce = Buffer.from(hkdfSync("sha256", ikm, sal, Buffer.from("Content-Encoding: nonce\0"), 12));

  // Un solo registro: contenido + delimitador 0x02.
  const cifrador = createCipheriv("aes-128-gcm", cek, nonce);
  const cuerpo = Buffer.concat([cifrador.update(Buffer.concat([contenido, Buffer.from([2])])), cifrador.final(), cifrador.getAuthTag()]);

  const tamRegistro = Buffer.alloc(4);
  tamRegistro.writeUInt32BE(4096);
  return Buffer.concat([sal, tamRegistro, Buffer.from([asPublica.length]), asPublica, cuerpo]);
}

/** Servicios de push conocidos: la ruta no manda a cualquier lado. */
const SERVICIOS = [/\.googleapis\.com$/, /\.push\.services\.mozilla\.com$/, /\.notify\.windows\.com$/, /^web\.push\.apple\.com$/];

export function esServicioDePush(endpoint: string): boolean {
  try {
    const url = new URL(endpoint);
    return url.protocol === "https:" && SERVICIOS.some((re) => re.test(url.hostname));
  } catch {
    return false;
  }
}

export type ResultadoEnvio = { ok: true } | { ok: false; status: number; vencida: boolean };

/** Manda un aviso. 404/410 quiere decir que la suscripción ya no existe y hay que borrarla. */
export async function enviarPush(suscripcion: SuscripcionPush, contenido: object, claves: ClavesVapid): Promise<ResultadoEnvio> {
  const cuerpo = cifrar(Buffer.from(JSON.stringify(contenido)), suscripcion);
  const r = await fetch(suscripcion.endpoint, {
    method: "POST",
    headers: {
      "Content-Encoding": "aes128gcm",
      "Content-Type": "application/octet-stream",
      TTL: String(24 * 3600),
      Urgency: "high",
      Authorization: `vapid t=${jwtVapid(suscripcion.endpoint, claves)}, k=${claves.publica}`,
    },
    body: new Uint8Array(cuerpo),
  });
  if (r.ok) return { ok: true };
  return { ok: false, status: r.status, vencida: r.status === 404 || r.status === 410 };
}
