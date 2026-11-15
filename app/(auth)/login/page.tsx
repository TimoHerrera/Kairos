import type { Metadata } from "next";
import { SeguirSiHaySesion } from "@/components/app/guardas";
import { Marco } from "@/components/app/pantalla";
import { Logo } from "@/components/brand/logo";
import { Acento, Bajada, Titulo } from "@/components/ui/bloque";
import { FormLogin } from "./form-login";

export const metadata: Metadata = { title: "Entrar" };

export default function Login() {
  return (
    <Marco>
      <SeguirSiHaySesion />
      <main className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pt-[max(24px,env(safe-area-inset-top))] pb-8">
        <Logo ancho={112} />
        <div className="mt-12">
          <Titulo as="h1">
            Entrá a tu <Acento>cartera</Acento>
          </Titulo>
          <Bajada className="mt-2">Con tu email alcanza. Kairos se acuerda del resto.</Bajada>
        </div>
        <FormLogin />
      </main>
    </Marco>
  );
}
