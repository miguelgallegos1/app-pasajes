// components/SelectorVista.tsx
// Selector "Lista / Por colaborador" reusado por las colas de acción e
// historiales de Coordinación y Nómina. Diseño sutil (texto + ícono, sin
// caja marcada) en vez del antiguo interruptor tipo píldora — y de paso
// evita el fondo blanco fijo que se veía mal en modo oscuro.

import type { ReactElement } from "react";
import { IconoControl, IconoPersonas } from "./Icons";

export type VistaListado = "lista" | "colaborador";

const OPCIONES: { value: VistaListado; label: string; icono: (props: { className?: string }) => ReactElement }[] = [
  { value: "lista", label: "Lista", icono: IconoControl },
  { value: "colaborador", label: "Por colaborador", icono: IconoPersonas },
];

export default function SelectorVista({
  valor,
  onCambiar,
  className = "",
}: {
  valor: VistaListado;
  onCambiar: (v: VistaListado) => void;
  className?: string;
}) {
  return (
    <div className={`inline-flex items-center gap-1 ${className}`}>
      {OPCIONES.map((op) => {
        const Icono = op.icono;
        const activo = valor === op.value;
        return (
          <button
            key={op.value}
            type="button"
            onClick={() => onCambiar(op.value)}
            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg transition ${
              activo
                ? "bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400"
                : "text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:text-neutral-200 dark:hover:bg-neutral-800"
            }`}
          >
            <Icono className="w-3.5 h-3.5" />
            {op.label}
          </button>
        );
      })}
    </div>
  );
}
