// components/EncabezadoOrdenable.tsx
// <th> clickeable que ordena una tabla por esa columna (asc/desc/ninguno).
// Puramente de presentación — cada tabla decide con qué campo comparar
// vía useOrdenTabla, esto solo dibuja la flecha y dispara el toggle.

import { IconoOrdenar } from "./Icons";

export default function EncabezadoOrdenable<T extends string>({
  campo,
  ordenActivo,
  onOrdenar,
  className = "",
  children,
}: {
  campo: T;
  ordenActivo: { campo: T; direccion: "asc" | "desc" } | null;
  onOrdenar: (campo: T) => void;
  className?: string;
  children: React.ReactNode;
}) {
  const activo = ordenActivo?.campo === campo;
  return (
    <th className={`px-4 py-3 font-medium ${className}`}>
      <button
        type="button"
        onClick={() => onOrdenar(campo)}
        className={`inline-flex items-center gap-1 select-none transition ${
          activo ? "text-neutral-900 dark:text-white" : "hover:text-neutral-700 dark:hover:text-neutral-300"
        }`}
      >
        {children}
        <IconoOrdenar
          className={`w-3 h-3 transition-all ${
            activo ? "opacity-100" : "opacity-25"
          } ${activo && ordenActivo?.direccion === "desc" ? "rotate-180" : ""}`}
        />
      </button>
    </th>
  );
}
