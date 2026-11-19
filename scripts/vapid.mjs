// Genera las claves VAPID para los avisos push, sin dependencias.
// Uso: npm run vapid  → copiá las dos líneas a .env.local y a Vercel.
import { createECDH } from "node:crypto";

const ecdh = createECDH("prime256v1");
ecdh.generateKeys();
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${ecdh.getPublicKey().toString("base64url")}`);
console.log(`VAPID_PRIVATE_KEY=${ecdh.getPrivateKey().toString("base64url")}`);
console.log("VAPID_SUBJECT=mailto:tu-email@ejemplo.com");
