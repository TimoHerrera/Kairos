"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

/** Vuelve a la pantalla anterior (por ejemplo, a la bienvenida o al Perfil). Si se entró directo, va al inicio. */
export function BotonVolver() {
  const router = useRouter();
  return (
    <button
      type="button"
      aria-label="Volver"
      onClick={() => (window.history.length > 1 ? router.back() : router.push("/"))}
      className="-ml-2 flex size-11 items-center justify-center rounded-full text-tinta hover:bg-superficie-tinte"
    >
      <ArrowLeft size={24} strokeWidth={1.75} aria-hidden="true" />
    </button>
  );
}
