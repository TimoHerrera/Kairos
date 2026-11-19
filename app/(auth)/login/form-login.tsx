"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Campo } from "@/components/ui/campo";
import { DATA_SOURCE_KIND, DataError, getDataSource, isValidEmail } from "@/lib/data";

export function FormLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviado, setEnviado] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState<"email" | "demo" | null>(null);

  async function entrar(e: FormEvent) {
    e.preventDefault();
    if (!isValidEmail(email)) {
      setError("Escribí un email válido, como lucia@remax.com.ar.");
      return;
    }
    setError(null);
    setOcupado("email");
    try {
      await getDataSource().auth.signIn({ email });
      router.replace("/hoy");
    } catch (err) {
      // Con Supabase se entra con un link al email: no es un error.
      if (err instanceof DataError && err.code === "check_email") setEnviado(err.message);
      else setError(err instanceof DataError ? err.message : "No pudimos entrar. Probá de nuevo.");
      setOcupado(null);
    }
  }

  async function entrarDemo() {
    setError(null);
    setOcupado("demo");
    try {
      await getDataSource().auth.signInDemo();
      router.replace("/hoy");
    } catch {
      setError("No pudimos abrir la demo. Probá de nuevo.");
      setOcupado(null);
    }
  }

  return (
    <div className="mt-8">
      <form onSubmit={entrar} noValidate>
        <Campo
          etiqueta="Email"
          type="email"
          name="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="vos@inmobiliaria.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={error}
        />
        <Button type="submit" ancho="completo" className="mt-4" disabled={ocupado !== null}>
          {ocupado === "email" ? "Entrando…" : "Entrar"}
        </Button>
      </form>
      {enviado ? (
        <p role="status" className="mt-3 rounded-md bg-exito-tinte px-3 py-2.5 text-cuerpo-s text-exito">
          {enviado}
        </p>
      ) : null}

      <div className="my-6 flex items-center gap-3 text-pie text-texto-suave">
        <span className="h-px flex-1 bg-linea" />o<span className="h-px flex-1 bg-linea" />
      </div>

      <Button variante="secundario" ancho="completo" onClick={entrarDemo} disabled={ocupado !== null}>
        {ocupado === "demo" ? "Abriendo la demo…" : "Probar la demo"}
      </Button>
      <p className="mt-2 text-pie text-texto-suave">
        Entrás como Lucía, una agente de ejemplo con su cartera cargada.
      </p>

      <p className="mt-8 text-pie text-texto-suave">
        {DATA_SOURCE_KIND === "mock"
          ? "Versión de prueba: los datos se guardan solo en este dispositivo y no hace falta contraseña."
          : "Sin contraseñas: te mandamos un link al email para entrar."}
      </p>
    </div>
  );
}
