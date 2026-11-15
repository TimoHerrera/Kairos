/*
 * Service worker de Kairos.
 * Cachea solo el app shell (archivos estáticos de la app, marca e íconos).
 * Nunca cachea datos de usuarios: nada de /api, ni respuestas de Supabase, ni páginas con datos.
 */
const VERSION = "kairos-shell-v1";
const SHELL = ["/offline.html", "/brand/logo-negativo.png", "/brand/icono-app.png", "/icons/icon-192.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(VERSION).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((claves) => Promise.all(claves.filter((c) => c !== VERSION).map((c) => caches.delete(c))))
      .then(() => self.clients.claim()),
  );
});

function esEstaticoDelShell(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/brand/") ||
    url.pathname.startsWith("/icons/")
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Archivos con hash o de marca: primero el caché.
  if (esEstaticoDelShell(url)) {
    event.respondWith(
      caches.match(request).then(
        (enCache) =>
          enCache ||
          fetch(request).then((respuesta) => {
            if (respuesta.ok) {
              const copia = respuesta.clone();
              caches.open(VERSION).then((cache) => cache.put(request, copia));
            }
            return respuesta;
          }),
      ),
    );
    return;
  }

  // Navegación: siempre la red. Sin conexión, la pantalla de "sin conexión".
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match("/offline.html")));
  }
  // Todo lo demás (datos, /api) va directo a la red y no se guarda.
});
