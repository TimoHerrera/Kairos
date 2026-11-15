export type Tema = "light" | "dark";
export type PreferenciaTema = Tema | "system";

export const CLAVE_TEMA = "kairos:tema";

/**
 * Corre antes del primer pintado (inline en <head>) para que no haya parpadeo.
 * Sin preferencia guardada, sigue a prefers-color-scheme.
 */
export const scriptTemaInicial = `(function(){try{var p=localStorage.getItem(${JSON.stringify(
  CLAVE_TEMA,
)});var d=p==="dark"||(p!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.dataset.theme=d?"dark":"light"}catch(e){}})()`;

export function leerPreferencia(): PreferenciaTema {
  if (typeof window === "undefined") return "system";
  try {
    const p = localStorage.getItem(CLAVE_TEMA);
    return p === "light" || p === "dark" ? p : "system";
  } catch {
    return "system";
  }
}

export function resolverTema(pref: PreferenciaTema, sistemaOscuro: boolean): Tema {
  if (pref === "system") return sistemaOscuro ? "dark" : "light";
  return pref;
}

export function aplicarPreferencia(pref: PreferenciaTema) {
  try {
    if (pref === "system") localStorage.removeItem(CLAVE_TEMA);
    else localStorage.setItem(CLAVE_TEMA, pref);
  } catch {
    // Sin almacenamiento (modo privado): el tema igual cambia en esta visita.
  }
  const oscuro = matchMedia("(prefers-color-scheme: dark)").matches;
  const raiz = document.documentElement;
  // El cambio de tema es instantáneo: sin transiciones de color a medio camino.
  raiz.classList.add("sin-transiciones");
  raiz.dataset.theme = resolverTema(pref, oscuro);
  void raiz.offsetHeight;
  setTimeout(() => raiz.classList.remove("sin-transiciones"), 0);
}
