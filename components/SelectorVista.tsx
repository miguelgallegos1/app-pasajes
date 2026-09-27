// components/SelectorVista.tsx
// Selector "Lista / Por colaborador" reusado por las colas de acción e
// historiales de Coordinación y Nómina. Diseño sutil (texto + ícono, sin
// caja marcada) en vez del antiguo interruptor tipo píldora — y de paso
// evita el fondo blanco fijo que se veía mal en modo oscuro.

"use client";

import { useEffect, useRef, useState, type ReactElement } from "react";
import { IconoControl, IconoPersonas, IconoChevron, IconoCheck } from "./Icons";

export type VistaListado = "lista" | "colaborador";

const OPCIONES: { value: VistaListado; label: string; icono: (props: { className?: string }) => ReactElement }[] = [
  { value: "lista", label: "Lista", icono: IconoControl },
  { value: "colaborador", label: "Por colaborador", icono: IconoPersonas },
];

export default function SelectorVista({
  valor,
  onCambiar,
  className = "",
  desplegable = false,
}: {
  valor: VistaListado;
  onCambiar: (v: VistaListado) => void;
  className?: string;
  // Barra de los historiales: un solo botón (como "Exportar ▾") que
  // despliega las dos opciones. Sin esto, el diseño sutil de siempre
  // (bandejas, Mis Pasajes).
  desplegable?: boolean;
}) {
  if (desplegable) return <MenuVista valor={valor} onCambiar={onCambiar} />;
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

// Botón "Lista ▾" / "Por colaborador ▾" de los historiales. En celular
// muestra solo el ícono. Se cierra al elegir, con clic afuera o con Escape.
function MenuVista({ valor, onCambiar }: { valor: VistaListado; onCambiar: (v: VistaListado) => void }) {
  const [abierto, setAbierto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const actual = OPCIONES.find((o) => o.value === valor) ?? OPCIONES[0];
  const IconoActual = actual.icono;

  useEffect(() => {
    if (!abierto) return;
    const alClic = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setAbierto(false);
    };
    const alTecla = (e: KeyboardEvent) => e.key === "Escape" && setAbierto(false);
    document.addEventListener("mousedown", alClic);
    document.addEventListener("keydown", alTecla);
    return () => {
      document.removeEventListener("mousedown", alClic);
      document.removeEventListener("keydown", alTecla);
    };
  }, [abierto]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setAbierto((a) => !a)}
        aria-haspopup="menu"
        aria-expanded={abierto}
        aria-label={`Vista: ${actual.label}`}
        title="Cambiar vista"
        className="inline-flex h-[42px] items-center justify-center gap-2 rounded-xl border border-neutral-300 bg-white px-3 text-sm font-medium text-neutral-700 transition hover:border-orange-400 hover:text-orange-600 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:border-orange-400 dark:hover:text-orange-400 sm:px-3.5"
      >
        <IconoActual className="w-4 h-4" />
        <span className="hidden sm:inline whitespace-nowrap">{actual.label}</span>
        <IconoChevron className={`hidden sm:block w-3.5 h-3.5 transition-transform ${abierto ? "-rotate-90" : "rotate-90"}`} />
      </button>

      {abierto && (
        <div
          role="menu"
          className="absolute right-0 z-40 mt-2 w-52 origin-top-right overflow-hidden rounded-2xl bg-white py-1.5 shadow-2xl ring-1 ring-black/5 animate-[dropdown-in_0.15s_ease-out] dark:bg-neutral-900 dark:ring-white/10"
        >
          {OPCIONES.map((op) => {
            const Icono = op.icono;
            const activo = op.value === valor;
            return (
              <button
                key={op.value}
                type="button"
                role="menuitemradio"
                aria-checked={activo}
                onClick={() => {
                  setAbierto(false);
                  if (!activo) onCambiar(op.value);
                }}
                className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition hover:bg-neutral-50 dark:hover:bg-neutral-800 ${
                  activo ? "font-semibold text-orange-600 dark:text-orange-400" : "text-neutral-800 dark:text-neutral-100"
                }`}
              >
                <Icono className="w-4 h-4" />
                <span className="flex-1">{op.label}</span>
                {activo && <IconoCheck className="w-4 h-4" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
