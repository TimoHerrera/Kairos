import { Logo } from "@/components/brand/logo";
import { SeguirSiHaySesion } from "@/components/app/guardas";
import { ButtonLink } from "@/components/ui/button";

/**
 * Splash: un momento de marca, siempre en noche (no cambia con el tema).
 * Sin animaciones extra: la llave solo se enciende con un match.
 * Falta el anillo de marca recortado por el borde: se agrega cuando estén los SVG originales.
 */
export default function Splash() {
  return (
    <main className="flex flex-1 flex-col bg-noche text-[#b8b1df]">
      <SeguirSiHaySesion />
      <div className="mx-auto flex w-full max-w-[430px] flex-1 flex-col px-4 pt-16 pb-8 md:px-0">
        <Logo version="negativo" ancho={132} />
        <div className="mt-auto">
          <h1 className="text-titulo-l text-papel text-balance">
            La oportunidad justa, en el momento <span className="text-lima">justo</span>.
          </h1>
          <p className="mt-3 max-w-[30ch] text-cuerpo">
            Kairos recuerda a cada cliente y te avisa cuando aparece su propiedad.
          </p>
          <ButtonLink href="/login" ancho="completo" variante="sobreNoche" className="mt-8">
            Empezar
          </ButtonLink>
        </div>
      </div>
    </main>
  );
}
