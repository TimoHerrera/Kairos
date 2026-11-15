"use client";

import { Campo } from "@/components/ui/campo";

export function MuestraCampos() {
  return (
    <div className="grid max-w-[390px] gap-4">
      <Campo etiqueta="Email" type="email" placeholder="vos@inmobiliaria.com" ayuda="Con tu email alcanza." />
      <Campo etiqueta="Presupuesto" defaultValue="USD 180.000" />
      <Campo etiqueta="Email del cliente" defaultValue="martina.gomez" error="Ese email no parece válido." />
    </div>
  );
}
