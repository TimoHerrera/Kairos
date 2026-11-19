import type { DataSource } from "@/lib/data/source";
import type { AgentSettings, Id, MatchWithRefs } from "@/lib/data/types";
import { direccionPropiedad } from "@/components/app/filas";
import { ambientesCorto } from "@/lib/domain/labels";
import { formatMonto } from "@/lib/format";
import { recalcularOportunidades } from "@/lib/match/recalcular";

/**
 * Avisos de oportunidades nuevas.
 * - Con claves VAPID y una suscripción: push real (llega aunque la app esté cerrada).
 * - Si no: una notificación local del propio dispositivo (sirve con la app abierta, por ejemplo en la demo).
 * Siempre respeta el horario de "no molestar". Las oportunidades igual quedan en Hoy y en la bandeja.
 */

export type Aviso = { title: string; body: string; url: string; tag: string };

const primerNombre = (n: string) => n.split(" ")[0];

/** El texto del aviso, como la pantalla 05. */
export function textoAviso(m: MatchWithRefs): Aviso {
  const p = m.property;
  return {
    title: `Esta propiedad le sirve a ${primerNombre(m.buyer.name)}`,
    body: `${ambientesCorto(p.property_type, p.rooms)} en ${direccionPropiedad(p)} · ${formatMonto(p.price, p.currency)} · ${m.score}% de encaje`,
    url: `/oportunidad/${m.id}`,
    tag: `oportunidad-${m.id}`,
  };
}

const minutos = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + (m || 0);
};

/** ¿Estamos dentro del horario de no molestar? Acepta rangos que cruzan la medianoche (22:00 a 8:00). */
export function enNoMolestar(settings: Pick<AgentSettings, "dnd_start" | "dnd_end">, ahora: Date = new Date()): boolean {
  if (!settings.dnd_start || !settings.dnd_end) return false;
  const desde = minutos(settings.dnd_start);
  const hasta = minutos(settings.dnd_end);
  const actual = ahora.getHours() * 60 + ahora.getMinutes();
  if (desde === hasta) return false;
  return desde < hasta ? actual >= desde && actual < hasta : actual >= desde || actual < hasta;
}

// --- Estado y permisos (solo navegador) ---------------------------------------

export type EstadoAvisos = "no-soportado" | "instalar-en-iphone" | "denegado" | "activado" | "desactivado";

export function esIphoneSinInstalar(): boolean {
  if (typeof navigator === "undefined") return false;
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const instalada = matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
  return ios && !instalada;
}

export function estadoAvisos(): EstadoAvisos {
  if (typeof window === "undefined") return "desactivado";
  if (esIphoneSinInstalar()) return "instalar-en-iphone";
  if (!("Notification" in window)) return "no-soportado";
  if (Notification.permission === "denied") return "denegado";
  return Notification.permission === "granted" ? "activado" : "desactivado";
}

const VAPID_PUBLICA = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

async function registroSW(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  return (await navigator.serviceWorker.getRegistration()) ?? null;
}

/** Pide permiso y, si hay push real configurado, suscribe este dispositivo. */
export async function activarAvisos(ds: DataSource): Promise<{ ok: boolean; mensaje: string }> {
  const estado = estadoAvisos();
  if (estado === "instalar-en-iphone") {
    return { ok: false, mensaje: "En iPhone, primero instalá Kairos en la pantalla de inicio: Compartir → Agregar a inicio." };
  }
  if (estado === "no-soportado") return { ok: false, mensaje: "Este navegador no muestra avisos." };
  const permiso = await Notification.requestPermission();
  if (permiso !== "granted") {
    return { ok: false, mensaje: "Sin permiso no puedo avisarte. Lo podés activar desde los ajustes del navegador." };
  }
  const reg = await registroSW();
  if (reg && VAPID_PUBLICA && "pushManager" in reg) {
    try {
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: VAPID_PUBLICA }));
      const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
      await ds.push.save({ endpoint: json.endpoint, keys: json.keys });
      return { ok: true, mensaje: "Listo: te aviso aunque Kairos esté cerrado." };
    } catch {
      return { ok: true, mensaje: "Listo: te aviso mientras Kairos esté abierto. El aviso con la app cerrada no se pudo activar." };
    }
  }
  return { ok: true, mensaje: "Listo: te aviso mientras Kairos esté abierto." };
}

export async function desactivarAvisos(ds: DataSource): Promise<void> {
  const reg = await registroSW();
  const sub = await reg?.pushManager?.getSubscription();
  if (sub) {
    await ds.push.remove(sub.endpoint);
    await sub.unsubscribe().catch(() => {});
  }
}

async function mostrarLocal(aviso: Aviso) {
  const reg = await registroSW();
  if (reg) {
    await reg.showNotification(aviso.title, { body: aviso.body, icon: "/icons/icon-192.png", tag: aviso.tag, data: { url: aviso.url } });
    return;
  }
  const n = new Notification(aviso.title, { body: aviso.body, icon: "/icons/icon-192.png", tag: aviso.tag });
  n.onclick = () => {
    window.focus();
    window.location.assign(aviso.url);
  };
}

/** Avisa de las oportunidades nuevas (como mucho tres, para no llenar el teléfono). */
export async function avisarOportunidades(ds: DataSource, nuevas: MatchWithRefs[], settings: AgentSettings): Promise<number> {
  if (typeof window === "undefined" || !nuevas.length) return 0;
  if (estadoAvisos() !== "activado" || enNoMolestar(settings)) return 0;

  const suscripciones = VAPID_PUBLICA ? await ds.push.list() : [];
  let enviados = 0;
  for (const m of nuevas.slice(0, 3)) {
    const aviso = textoAviso(m);
    let llego = false;
    for (const s of suscripciones) {
      try {
        const r = await fetch("/api/push/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ suscripcion: { endpoint: s.endpoint, keys: s.keys }, aviso }),
        });
        const json = (await r.json()) as { ok: boolean; vencida?: boolean };
        if (json.ok) llego = true;
        else if (json.vencida) await ds.push.remove(s.endpoint);
      } catch {
        // sin red: queda la notificación local
      }
    }
    if (!llego) {
      try {
        await mostrarLocal(aviso);
        llego = true;
      } catch {
        // el navegador no dejó: la oportunidad igual está en Hoy y en la bandeja
      }
    }
    if (llego) enviados += 1;
  }
  return enviados;
}

/** Recalcula y avisa de lo nuevo. Es lo que usan la carga de propiedades, las fichas y las notas. */
export async function recalcularYAvisar(ds: DataSource, alcance: { propiedadIds?: Id[]; clienteIds?: Id[] }) {
  const resultado = await recalcularOportunidades(ds, alcance);
  if (resultado.nuevas.length) {
    const agente = await ds.agent.get();
    await avisarOportunidades(ds, resultado.nuevas, agente.settings).catch(() => 0);
  }
  return resultado;
}
