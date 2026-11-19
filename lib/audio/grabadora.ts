"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Grabación de una nota de voz con onda, timer, transcripción en vivo y límite de 3 minutos.
 *
 * Modos (TRANSCRIBE_PROVIDER):
 * - webspeech: el navegador transcribe en vivo (Web Speech API, es-AR). Gratis, sin servidor.
 * - openai: graba el audio y lo transcribe el servidor al terminar. Si el navegador
 *   tiene Web Speech, la usa para mostrar el texto en vivo mientras tanto.
 * - mock: no usa el micrófono; "escucha" un guion fijo de la demo.
 */

export type ModoTranscripcion = "webspeech" | "openai" | "mock";
/** Lo que configura el servidor: "auto" elige el micrófono real si el navegador lo permite. */
export type ModoConfigurado = ModoTranscripcion | "auto";
export type EstadoGrabacion = "inactivo" | "pidiendo" | "grabando" | "transcribiendo" | "listo" | "error";

export const LIMITE_SEGUNDOS = 180;
export const BARRAS = 34;

// Tipos mínimos de la Web Speech API (no vienen en lib.dom en todos los navegadores).
type ResultadoVoz = { isFinal: boolean; 0: { transcript: string } };
type EventoVoz = { resultIndex: number; results: ArrayLike<ResultadoVoz> };
type Reconocedor = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: EventoVoz) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
};

function crearReconocedor(): Reconocedor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => Reconocedor; webkitSpeechRecognition?: new () => Reconocedor };
  const Clase = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  return Clase ? new Clase() : null;
}

export function hayTranscripcionEnVivo(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as unknown as Record<string, unknown>;
  return Boolean(w.SpeechRecognition ?? w.webkitSpeechRecognition);
}

const SILENCIO = () => Array.from({ length: BARRAS }, () => 0);

export function useGrabadora({ modo, guion }: { modo: ModoTranscripcion; guion?: string }) {
  const [estado, setEstado] = useState<EstadoGrabacion>("inactivo");
  const [segundos, setSegundos] = useState(0);
  const [niveles, setNiveles] = useState<number[]>(SILENCIO);
  const [texto, setTexto] = useState("");
  const [error, setError] = useState<string | null>(null);

  const recursos = useRef<{
    stream?: MediaStream;
    contexto?: AudioContext;
    grabador?: MediaRecorder;
    trozos: Blob[];
    reconocedor?: Reconocedor | null;
    finales: string;
    frame?: number;
    timer?: number;
    escritura?: number;
    inicio: number;
    activo: boolean;
  }>({ trozos: [], finales: "", inicio: 0, activo: false });

  const liberar = useCallback(() => {
    const r = recursos.current;
    r.activo = false;
    if (r.frame) cancelAnimationFrame(r.frame);
    if (r.timer) clearInterval(r.timer);
    if (r.escritura) clearInterval(r.escritura);
    r.reconocedor?.abort();
    r.reconocedor = null;
    r.stream?.getTracks().forEach((t) => t.stop());
    r.stream = undefined;
    void r.contexto?.close().catch(() => {});
    r.contexto = undefined;
    setNiveles(SILENCIO());
  }, []);

  useEffect(() => liberar, [liberar]);

  const terminar = useCallback(async () => {
    const r = recursos.current;
    if (!r.activo) return;
    const duracion = Math.round((Date.now() - r.inicio) / 1000);
    setSegundos(Math.min(duracion, LIMITE_SEGUNDOS));

    if (modo === "openai" && r.grabador) {
      const grabador = r.grabador;
      const terminado = new Promise<void>((ok) => grabador.addEventListener("stop", () => ok(), { once: true }));
      if (grabador.state !== "inactive") grabador.stop();
      await terminado;
      liberar();
      setEstado("transcribiendo");
      try {
        const audio = new Blob(r.trozos, { type: grabador.mimeType || "audio/webm" });
        const datos = new FormData();
        datos.append("audio", audio, `nota.${(grabador.mimeType || "audio/webm").includes("mp4") ? "m4a" : "webm"}`);
        const respuesta = await fetch("/api/ai/transcribe", { method: "POST", body: datos });
        const json = (await respuesta.json()) as { ok: boolean; texto?: string; error?: string };
        if (!json.ok || !json.texto) throw new Error(json.error ?? "No pudimos transcribir el audio.");
        setTexto(json.texto);
        setEstado("listo");
      } catch (e) {
        setError(e instanceof Error ? e.message : "No pudimos transcribir el audio.");
        setEstado(r.finales.trim() ? "listo" : "error");
      }
      return;
    }

    liberar();
    if (modo === "mock" && guion) setTexto(guion);
    setEstado("listo");
  }, [guion, liberar, modo]);

  // El límite de 3 minutos corta solo.
  useEffect(() => {
    if (estado === "grabando" && segundos >= LIMITE_SEGUNDOS) void terminar();
  }, [estado, segundos, terminar]);

  const empezar = useCallback(async () => {
    const r = recursos.current;
    setError(null);
    setTexto("");
    setSegundos(0);
    r.trozos = [];
    r.finales = "";

    const arrancarTimer = () => {
      r.inicio = Date.now();
      r.activo = true;
      r.timer = window.setInterval(() => setSegundos(Math.floor((Date.now() - r.inicio) / 1000)), 250);
    };

    if (modo === "mock") {
      setEstado("grabando");
      arrancarTimer();
      // Onda simulada y el guion "escribiéndose" como en la demo.
      const quieto = matchMedia("(prefers-reduced-motion: reduce)").matches;
      const animar = () => {
        if (!r.activo) return;
        const t = Date.now() / 160;
        setNiveles(
          Array.from({ length: BARRAS }, (_, i) =>
            quieto ? 0.35 : 0.25 + 0.6 * Math.abs(Math.sin(t + i * 0.55) * Math.cos(t / 2.3 + i * 0.21)),
          ),
        );
        r.frame = requestAnimationFrame(animar);
      };
      r.frame = requestAnimationFrame(animar);
      const palabras = (guion ?? "").split(" ");
      let i = 0;
      r.escritura = window.setInterval(() => {
        i += 1;
        setTexto(palabras.slice(0, i).join(" "));
        if (i >= palabras.length) {
          clearInterval(r.escritura);
          r.escritura = undefined;
          window.setTimeout(() => void terminar(), 900);
        }
      }, 140);
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Este navegador no deja grabar audio. Podés escribir la nota.");
      setEstado("error");
      return;
    }
    if (modo === "webspeech" && !hayTranscripcionEnVivo()) {
      setError("Este navegador no transcribe en vivo. Probá con Chrome, o escribí la nota.");
      setEstado("error");
      return;
    }

    setEstado("pidiendo");
    try {
      r.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    } catch {
      setError("Necesito permiso para usar el micrófono. Activalo en el navegador o escribí la nota.");
      setEstado("error");
      return;
    }

    // Onda: el nivel real del micrófono.
    try {
      const contexto = new AudioContext();
      const analizador = contexto.createAnalyser();
      analizador.fftSize = 128;
      contexto.createMediaStreamSource(r.stream).connect(analizador);
      r.contexto = contexto;
      const datos = new Uint8Array(analizador.frequencyBinCount);
      const quieto = matchMedia("(prefers-reduced-motion: reduce)").matches;
      const animar = () => {
        if (!r.activo) return;
        analizador.getByteFrequencyData(datos);
        const medio = datos.reduce((a, b) => a + b, 0) / datos.length / 255;
        setNiveles(
          Array.from({ length: BARRAS }, (_, i) => {
            if (quieto) return medio > 0.05 ? 0.4 : 0.1;
            const v = datos[(i * 2) % datos.length] / 255;
            return Math.min(1, 0.08 + v * 0.9 + medio * 0.3);
          }),
        );
        r.frame = requestAnimationFrame(animar);
      };
      r.frame = requestAnimationFrame(animar);
    } catch {
      // Sin onda igual se graba.
    }

    if (modo === "openai") {
      try {
        const grabador = new MediaRecorder(r.stream);
        grabador.ondataavailable = (e) => {
          if (e.data.size) r.trozos.push(e.data);
        };
        grabador.start(1000);
        r.grabador = grabador;
      } catch {
        liberar();
        setError("No pudimos empezar a grabar. Probá de nuevo o escribí la nota.");
        setEstado("error");
        return;
      }
    }

    // Texto en vivo con la Web Speech API (en openai es solo una vista previa).
    const reconocedor = crearReconocedor();
    if (reconocedor) {
      reconocedor.lang = "es-AR";
      reconocedor.continuous = true;
      reconocedor.interimResults = true;
      reconocedor.onresult = (e) => {
        let provisorio = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const res = e.results[i];
          if (res.isFinal) r.finales += `${res[0].transcript.trim()} `;
          else provisorio += res[0].transcript;
        }
        setTexto((r.finales + provisorio).trim());
      };
      reconocedor.onerror = (e) => {
        // "no-speech" y "aborted" son normales; el resto corta la transcripción en vivo.
        if (e.error === "no-speech" || e.error === "aborted") return;
        const mensaje =
          e.error === "network"
            ? "Se cortó la conexión con el servicio de voz. Revisá internet o escribí la nota."
            : e.error === "audio-capture"
              ? "No encuentro un micrófono. Revisá que esté conectado o escribí la nota."
              : "El navegador no dejó transcribir. Podés escribir la nota.";
        setError(mensaje);
        // Sin esto, onend lo vuelve a arrancar y falla en bucle.
        r.reconocedor = null;
        if (modo === "webspeech") {
          liberar();
          setEstado(r.finales.trim() ? "listo" : "error");
        }
      };
      // El navegador corta solo tras un silencio: si seguimos grabando, se reanuda.
      reconocedor.onend = () => {
        if (r.activo && r.reconocedor === reconocedor) {
          try {
            reconocedor.start();
          } catch {
            // ya estaba andando
          }
        }
      };
      r.reconocedor = reconocedor;
      try {
        reconocedor.start();
      } catch {
        // sin vista previa
      }
    }

    setEstado("grabando");
    arrancarTimer();
  }, [guion, liberar, modo, terminar]);

  const reiniciar = useCallback(() => {
    liberar();
    setEstado("inactivo");
    setSegundos(0);
    setTexto("");
    setError(null);
  }, [liberar]);

  return { estado, segundos, niveles, texto, setTexto, error, empezar, parar: terminar, reiniciar };
}

export function formatDuracion(segundos: number): string {
  return `${Math.floor(segundos / 60)}:${String(segundos % 60).padStart(2, "0")}`;
}
