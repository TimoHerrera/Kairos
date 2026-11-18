"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Campo } from "@/components/ui/campo";
import { Hoja, HojaAcciones } from "@/components/ui/hoja";
import { DataError } from "@/lib/data";
import { useCreateBuyer } from "@/lib/data/hooks";
import { normalizarTelefono } from "@/lib/format/telefono";

export function NuevoCliente({ abierta, onCerrar }: { abierta: boolean; onCerrar: () => void }) {
  return (
    <Hoja
      abierta={abierta}
      onCerrar={onCerrar}
      titulo="Nuevo cliente"
      descripcion="Con el nombre alcanza. Lo demás lo completás después o lo arma Kairos con tu audio."
    >
      <Formulario onCerrar={onCerrar} />
    </Hoja>
  );
}

function Formulario({ onCerrar }: { onCerrar: () => void }) {
  const router = useRouter();
  const crear = useCreateBuyer();
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [errores, setErrores] = useState<{ nombre?: string; telefono?: string; email?: string }>({});
  const [repetido, setRepetido] = useState<{ id: string; name: string } | null>(null);

  async function guardar(e: FormEvent) {
    e.preventDefault();
    setRepetido(null);
    const nuevos: typeof errores = {};
    if (!nombre.trim()) nuevos.nombre = "Decime cómo se llama.";
    const tel = telefono.trim() ? normalizarTelefono(telefono) : null;
    if (telefono.trim() && !tel) nuevos.telefono = "Revisá el número: con código de área, por ejemplo 11 5555 0101.";
    setErrores(nuevos);
    if (Object.keys(nuevos).length) return;

    try {
      const cliente = await crear.mutateAsync({ name: nombre, phone: tel, email: email || null });
      onCerrar();
      router.push(`/clientes/${cliente.id}`);
    } catch (err) {
      if (err instanceof DataError && err.code === "duplicate_email") {
        setRepetido(err.existing ?? null);
        setErrores({ email: err.message });
      } else if (err instanceof DataError) {
        setErrores({ email: err.message });
      } else {
        setErrores({ nombre: "No pudimos guardarlo. Probá de nuevo." });
      }
    }
  }

  return (
    <form onSubmit={guardar} noValidate className="space-y-4">
      <Campo
        etiqueta="Nombre"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        autoComplete="off"
        autoCapitalize="words"
        placeholder="Martina Gómez"
        error={errores.nombre}
      />
      <Campo
        etiqueta="WhatsApp (opcional)"
        type="tel"
        inputMode="tel"
        value={telefono}
        onChange={(e) => setTelefono(e.target.value)}
        autoComplete="off"
        placeholder="11 5555 0101"
        ayuda="Con código de área. Lo usamos para abrirte el chat."
        error={errores.telefono}
      />
      <div>
        <Campo
          etiqueta="Email (opcional)"
          type="email"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          error={errores.email}
        />
        {repetido ? (
          <Link
            href={`/clientes/${repetido.id}`}
            onClick={onCerrar}
            className="mt-2 inline-flex min-h-11 items-center text-boton text-acento underline underline-offset-2"
          >
            Ver la ficha de {repetido.name}
          </Link>
        ) : null}
      </div>
      <HojaAcciones>
        <Button type="submit" ancho="completo" disabled={crear.isPending}>
          {crear.isPending ? "Guardando…" : "Guardar cliente"}
        </Button>
        <Button variante="terciario" ancho="completo" onClick={onCerrar}>
          Cancelar
        </Button>
      </HojaAcciones>
    </form>
  );
}
