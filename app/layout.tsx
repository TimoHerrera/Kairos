import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Fraunces, Inter } from "next/font/google";
import Script from "next/script";
import { RegistrarServiceWorker } from "@/components/pwa/registrar-sw";
import { SessionProvider } from "@/lib/session/provider";
import { scriptTemaInicial } from "@/lib/theme";
import "./globals.css";

// Fraunces para decir, Inter para leer.
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["opsz"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Kairos", template: "%s · Kairos" },
  description: "La oportunidad justa, en el momento justo.",
  applicationName: "Kairos",
  appleWebApp: { capable: true, title: "Kairos", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#1B1345",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es-AR" className={`${fraunces.variable} ${inter.variable} h-full`} suppressHydrationWarning>
      <body className="flex min-h-full flex-col">
        {/* Elige el tema antes de pintar, para que no parpadee. */}
        <Script id="tema-inicial" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: scriptTemaInicial }} />
        <SessionProvider>{children}</SessionProvider>
        <RegistrarServiceWorker />
      </body>
    </html>
  );
}
