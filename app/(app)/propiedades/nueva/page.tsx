import type { Metadata } from "next";
import { AltaPropiedad } from "./alta";

export const metadata: Metadata = { title: "Cargar propiedad" };

export default function Page() {
  return <AltaPropiedad />;
}
