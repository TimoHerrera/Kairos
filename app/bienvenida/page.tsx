import type { Metadata } from "next";
import { SoloConSesion } from "@/components/app/guardas";
import { Marco } from "@/components/app/pantalla";
import { Bienvenida } from "./bienvenida";

export const metadata: Metadata = { title: "Bienvenida" };

export default function Page() {
  return (
    <Marco>
      <SoloConSesion>
        <Bienvenida />
      </SoloConSesion>
    </Marco>
  );
}
