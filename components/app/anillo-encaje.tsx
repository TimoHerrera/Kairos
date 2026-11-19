"use client";

import { useEffect, useState } from "react";

const RADIO = 35;
const CIRCUNFERENCIA = 2 * Math.PI * RADIO;

/**
 * El anillo de encaje (pantalla 06): lima sobre noche, se llena hasta el puntaje.
 * Es el momento de marca de un match. Con movimiento reducido aparece ya lleno.
 */
export function AnilloEncaje({ score, tamano = 84 }: { score: number; tamano?: number }) {
  const [lleno, setLleno] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setLleno(true));
    return () => cancelAnimationFrame(id);
  }, []);
  const offset = CIRCUNFERENCIA * (1 - (lleno ? score : 0) / 100);

  return (
    <div className="relative shrink-0" style={{ width: tamano, height: tamano }}>
      <svg width={tamano} height={tamano} viewBox="0 0 84 84" role="img" aria-label={`${score}% de encaje`}>
        <circle cx="42" cy="42" r={RADIO} fill="none" stroke="rgba(245,243,254,.12)" strokeWidth="9" />
        <circle
          cx="42"
          cy="42"
          r={RADIO}
          fill="none"
          stroke="var(--lima)"
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={CIRCUNFERENCIA}
          strokeDashoffset={offset}
          transform="rotate(-90 42 42)"
          className="transition-[stroke-dashoffset] duration-[900ms] ease-[cubic-bezier(.22,.61,.36,1)] motion-reduce:transition-none"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-display text-[24px] leading-none font-semibold text-papel" aria-hidden="true">
        {score}%
      </span>
    </div>
  );
}
