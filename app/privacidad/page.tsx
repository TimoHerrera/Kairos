import type { Metadata } from "next";
import type { ReactNode } from "react";
import { BotonVolver } from "@/components/app/boton-volver";
import { Logo } from "@/components/brand/logo";
import { Bajada, Eyebrow, Titulo } from "@/components/ui/bloque";

export const metadata: Metadata = { title: "Privacidad" };

function Seccion({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="text-subtitulo text-tinta">{titulo}</h2>
      <div className="mt-2 space-y-2 text-cuerpo text-texto">{children}</div>
    </section>
  );
}

/** Política de privacidad simple (Ley 25.326 de Protección de Datos Personales). */
export default function Privacidad() {
  return (
    <main className="mx-auto w-full max-w-[640px] px-4 pt-6 pb-16 md:px-0">
      <div className="flex items-center justify-between">
        <BotonVolver />
        <Logo ancho={96} />
      </div>

      <Eyebrow className="mt-6">Privacidad</Eyebrow>
      <Titulo as="h1" className="mt-1">
        Cómo cuidamos tus datos
      </Titulo>
      <Bajada className="mt-2">En corto: los datos de tus clientes son tuyos, solo los ves vos y los podés llevar o borrar cuando quieras.</Bajada>

      <Seccion titulo="Qué guardamos">
        <p>Tus datos de agente (nombre, email, oficina) y lo que cargás de tus clientes: nombre, teléfono, email, qué buscan, tus notas y las propiedades que les ofrecés.</p>
        <p>Los datos de tus clientes son datos personales en los términos de la Ley 25.326. Vos sos responsable de tener su consentimiento para guardarlos, como ya lo hacés en tu agenda o en WhatsApp.</p>
      </Seccion>

      <Seccion titulo="Para qué">
        <p>Solo para armar las fichas, encontrar las propiedades que les sirven y ayudarte a escribirles. No vendemos ni compartimos datos con nadie, y no los usamos para publicidad.</p>
      </Seccion>

      <Seccion titulo="Quién los ve">
        <p>Solo vos. Cada cuenta ve únicamente sus clientes: lo controla la base de datos, no solo la app.</p>
      </Seccion>

      <Seccion titulo="Servicios de IA">
        <p>
          Para pasar un audio a texto, el audio se procesa con un servicio de transcripción (el de tu navegador, o el de OpenAI si la cuenta lo usa). Para ordenar la ficha y redactar
          mensajes, el texto se procesa con Claude, de Anthropic.
        </p>
        <p>Les mandamos lo mínimo: el texto de la nota y un resumen de lo que busca el cliente, o el nombre de pila y los datos de la propiedad. Nunca su teléfono ni su email.</p>
        <p>Por defecto, el audio se borra después de transcribirlo. Lo podés cambiar en Perfil → Privacidad.</p>
      </Seccion>

      <Seccion titulo="Tus derechos">
        <p>
          Podés acceder a tus datos, corregirlos y borrarlos. Desde Perfil → Privacidad descargás todo en un archivo o borrás tu cuenta con todo lo que contiene. La Agencia de Acceso a la
          Información Pública es la autoridad de control de la Ley 25.326.
        </p>
      </Seccion>

      <Seccion titulo="Avisos">
        <p>Si los activás, te avisamos cuando una propiedad le sirve a un cliente. El aviso trae solo el nombre de pila y un resumen de la propiedad. Los podés apagar cuando quieras.</p>
      </Seccion>

      <p className="mt-8 text-pie text-texto-suave">Kairos es un proyecto de tesis de la Universidad de San Andrés. Última actualización: noviembre de 2026.</p>
    </main>
  );
}
