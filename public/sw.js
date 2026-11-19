/*
 * Service worker de Kairos.
 * Cachea solo el app shell (archivos estáticos de la app, marca e íconos).
 * Nunca cachea datos de usuarios: nada de /api, ni respuestas de Supabase, ni páginas con datos.
 */
const VERSION = "kairos-shell-v2";
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

// --- Avisos push --------------------------------------------------------------
// El aviso trae solo título, texto y a dónde ir: nada de la cartera queda guardado acá.
self.addEventListener("push", (event) => {
  let aviso = { title: "Kairos", body: "Tenés una oportunidad nueva.", url: "/hoy", tag: "kairos" };
  try {
    if (event.data) aviso = { ...aviso, ...event.data.json() };
  } catch {
    // Un aviso sin datos legibles igual se muestra, con el texto genérico.
  }
  event.waitUntil(
    self.registration.showNotification(aviso.title, {
      body: aviso.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: aviso.tag,
      data: { url: aviso.url },
    }),
  );
});

// Tocar el aviso abre la oportunidad: en la pestaña de Kairos que ya esté abierta, o en una nueva.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/hoy", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((ventanas) => {
      for (const v of ventanas) {
        if (new URL(v.url).origin === self.location.origin && "navigate" in v) {
          return v.focus().then(() => v.navigate(url));
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
