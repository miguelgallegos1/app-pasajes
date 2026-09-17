// components/MenuAcciones.tsx
// Menú "⋮" para las acciones secundarias de una fila de tabla (Editar,
// Gestionar, etc.). Antes cada fila mostraba 2-3 botones siempre visibles,
// lo que se veía recargado — sobre todo en pantallas angostas. Agrupados
// acá, la fila queda limpia y las acciones aparecen bajo demanda.

"use client";

import { useState, useRef, useEffect } from "react";
import { IconoMas } from "./Icons";

export type AccionMenu = { label: string; onClick: () => void; tono?: "normal" | "peligro"; deshabilitado?: boolean };

export default function MenuAcciones({ acciones }: { acciones: AccionMenu[] }) {
  const [abierto, setAbierto] = useState(false);
  const contenedorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function manejarClickAfuera(e: MouseEvent) {
      if (contenedorRef.current && !contenedorRef.current.contains(e.target as Node)) setAbierto(false);
    }
    function manejarEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setAbierto(false);
    }
    document.addEventListener("mousedown", manejarClickAfuera);
    document.addEventListener("keydown", manejarEscape);
    return () => {
      document.removeEventListener("mousedown", manejarClickAfuera);
      document.removeEventListener("keydown", manejarEscape);
    };
  }, []);

  return (
    <div className="relative inline-block" ref={contenedorRef}>
      <button
        type="button"
        onClick={() => setAbierto((a) => !a)}
        title="Más acciones"
        aria-label="Más acciones"
        aria-haspopup="menu"
        aria-expanded={abierto}
        className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 dark:text-neutral-500 dark:hover:text-neutral-200 dark:hover:bg-neutral-800 transition"
      >
        <IconoMas className="w-4 h-4" />
      </button>

      {abierto && (
        <div
          role="menu"
          className="absolute right-0 mt-1 w-40 bg-white dark:bg-neutral-900 ring-1 ring-black/5 dark:ring-white/10 rounded-xl shadow-2xl overflow-hidden origin-top-right animate-[dropdown-in_0.15s_ease-out] z-30 py-1"
        >
          {acciones.map((a) => (
            <button
              key={a.label}
              type="button"
              role="menuitem"
              disabled={a.deshabilitado}
              onClick={() => {
                setAbierto(false);
                a.onClick();
              }}
              className={`w-full text-left px-3.5 py-2 text-sm transition disabled:opacity-40 disabled:cursor-not-allowed ${
                a.tono === "peligro"
                  ? "text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10"
                  : "text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800"
              }`}
            >
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
