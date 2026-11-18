import { ChevronDown } from "lucide-react";
import { useId, type ComponentProps } from "react";

/** Lista desplegable con etiqueta visible. Usa el selector nativo, que en el celular es el más cómodo. */
export function Selector<T extends string>({
  etiqueta,
  opciones,
  className,
  ...rest
}: {
  etiqueta: string;
  opciones: ReadonlyArray<{ valor: T; texto: string }>;
} & Omit<ComponentProps<"select">, "id" | "children">) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block text-[14px] leading-5 font-semibold text-tinta">
        {etiqueta}
      </label>
      <div className="relative">
        <select
          id={id}
          className="block min-h-12 w-full appearance-none rounded-md border border-linea-control bg-superficie pr-10 pl-4 text-cuerpo text-tinta"
          {...rest}
        >
          {opciones.map((o) => (
            <option key={o.valor} value={o.valor}>
              {o.texto}
            </option>
          ))}
        </select>
        <ChevronDown
          size={20}
          strokeWidth={1.75}
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-texto"
        />
      </div>
    </div>
  );
}
