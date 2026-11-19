import { Suspense, type ReactNode } from "react";
import { RequiereBienvenida, SoloConSesion } from "@/components/app/guardas";
import { Marco } from "@/components/app/pantalla";
import { TabBar, TabBarBase } from "@/components/app/tab-bar";

/** Todo lo que está acá adentro necesita sesión y comparte la tab bar. */
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <Marco>
      <SoloConSesion>
        <RequiereBienvenida />
        {children}
        <Suspense fallback={<TabBarBase actual="" />}>
          <TabBar />
        </Suspense>
      </SoloConSesion>
    </Marco>
  );
}
