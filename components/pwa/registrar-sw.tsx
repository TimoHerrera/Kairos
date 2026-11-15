"use client";

import { useEffect } from "react";

/** Registra el service worker solo en producción, para no cachear el entorno de desarrollo. */
export function RegistrarServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {
      // Sin service worker la app funciona igual; solo no se instala ni recibe avisos.
    });
  }, []);
  return null;
}
