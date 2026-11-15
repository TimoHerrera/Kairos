import type { ReactNode } from "react";
import { SoloConSesion } from "@/components/app/guardas";
import { Marco } from "@/components/app/pantalla";
import { TabBar } from "@/components/app/tab-bar";

/** Todo lo que está acá adentro necesita sesión y comparte la tab bar. */
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <Marco>
      <SoloConSesion>
        {children}
        <TabBar />
      </SoloConSesion>
    </Marco>
  );
}
