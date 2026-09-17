// components/EstadoVacio.tsx
// Bloque reutilizable para "no hay nada que mostrar": ícono + mensaje,
// centrado. Se usa dentro de un <td> (tablas) o de un <div> (listas,
// desplegables) — el padding y el colSpan los define el contenedor.

import { IconoCajaVacia } from "./Icons";
import type { ReactNode } from "react";

export default function EstadoVacio({
  mensaje,
  icono,
  className = "",
}: {
  mensaje: string;
  icono?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col items-center gap-2 text-neutral-400 dark:text-neutral-500 ${className}`}>
      {icono ?? <IconoCajaVacia className="w-10 h-10 text-neutral-300 dark:text-neutral-600" />}
      <p className="text-sm">{mensaje}</p>
    </div>
  );
}
