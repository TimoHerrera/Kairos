"use client";

import { RotateCcw } from "lucide-react";
import { useState } from "react";
import { AvisoOportunidad } from "@/components/ui/aviso-oportunidad";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";

/** Muestra el aviso y deja repetir su entrada (8 px con fundido, 200 ms). */
export function RepetirAviso() {
  const [vuelta, setVuelta] = useState(0);
  return (
    <div className="flex flex-col items-start gap-3">
      <AvisoOportunidad
        key={vuelta}
        cuando="hace 2 min"
        titulo="Esta propiedad le sirve a Martina"
        resumen="3 ambientes en Palermo, USD 172 mil. Busca hasta USD 180 mil y quiere mudarse antes de marzo."
        etiqueta={<Chip variante="oportunidad">Nueva oportunidad</Chip>}
        acciones={
          <>
            <Button tamano="sm">Avisar a Martina</Button>
            <Button tamano="sm" variante="terciario">
              Ahora no
            </Button>
          </>
        }
        className="w-full max-w-[420px]"
      />
      <Button
        variante="secundario"
        tamano="sm"
        icono={<RotateCcw size={20} strokeWidth={1.75} aria-hidden="true" />}
        onClick={() => setVuelta((v) => v + 1)}
      >
        Repetir la entrada
      </Button>
    </div>
  );
}
