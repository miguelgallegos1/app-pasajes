// components/SelectorModerno.tsx
// Selector desplegable simple (SIN buscador), con el mismo estilo moderno
// que ComboboxBuscable y CalendarioSelector. Úsalo cuando la lista de
// opciones es corta y no hace falta filtrar (ej: un estado, un tipo).

"use client";

import { useState, useRef, useEffect } from "react";

type Opcion = { value: string; label: string };

export default function SelectorModerno({
  opciones,
  value,
  onChange,
  placeholder = "Selecciona una opción",
}: {
  opciones: Opcion[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const contenedorRef = useRef<HTMLDivElement>(null);

  const opcionSeleccionada = opciones.find((o) => o.value === value);

  useEffect(() => {
    function manejarClickAfuera(e: MouseEvent) {
      if (contenedorRef.current && !contenedorRef.current.contains(e.target as Node)) {
        setAbierto(false);
      }
    }
    document.addEventListener("mousedown", manejarClickAfuera);
    return () => document.removeEventListener("mousedown", manejarClickAfuera);
  }, []);

  const elegir = (opcion: Opcion) => {
    onChange(opcion.value);
    setAbierto(false);
  };

  return (
    <div className="relative" ref={contenedorRef}>
      <button
        type="button"
        onClick={() => setAbierto((a) => !a)}
        className={`w-full flex items-center justify-between rounded-xl px-3.5 py-3 text-left text-sm
          border transition
          ${abierto ? "border-orange-400 ring-2 ring-orange-500/15" : "border-neutral-200 hover:border-neutral-300"}
        `}
      >
        <span className={opcionSeleccionada ? "text-neutral-900 font-medium" : "text-neutral-400"}>
          {opcionSeleccionada ? opcionSeleccionada.label : placeholder}
        </span>
        <svg
          viewBox="0 0 24 24"
          className={`w-4 h-4 text-neutral-400 shrink-0 transition-transform ${abierto ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <div
        className={`absolute z-50 mt-2 w-full bg-white ring-1 ring-black/5 rounded-2xl shadow-2xl overflow-hidden
          transition-all duration-150 origin-top
          ${abierto ? "opacity-100 scale-100 pointer-events-auto" : "opacity-0 scale-95 pointer-events-none"}
        `}
      >
        <div className="py-1 max-h-56 overflow-y-auto">
          {opciones.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => elegir(o)}
              className={`w-full text-left px-4 py-2.5 text-sm transition
                ${o.value === value ? "bg-orange-50 text-orange-700 font-medium" : "text-neutral-700 hover:bg-neutral-50"}
              `}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}