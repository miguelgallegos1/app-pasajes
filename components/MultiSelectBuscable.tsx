// components/MultiSelectBuscable.tsx
// Selector múltiple con buscador, mismo look que ComboboxBuscable. Aunque
// "opciones" tenga muchísimos elementos, en pantalla nunca se pintan todos:
// solo los que coinciden con lo que se va escribiendo (y como mucho, un
// límite razonable), para no tildar el navegador con áreas grandes.

"use client";

import { useState, useRef, useEffect } from "react";

type Opcion = { id: string; label: string };

const LIMITE_VISIBLE = 50;

export default function MultiSelectBuscable({
  opciones,
  value,
  onChange,
  placeholder = "Buscar...",
}: {
  opciones: Opcion[];
  value: string[];
  onChange: (ids: string[]) => void;
  placeholder?: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const contenedorRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const seleccionadas = opciones.filter((o) => value.includes(o.id));
  const texto = busqueda.trim().toLowerCase();
  const disponibles = opciones.filter((o) => !value.includes(o.id) && o.label.toLowerCase().includes(texto));
  const visibles = disponibles.slice(0, LIMITE_VISIBLE);

  useEffect(() => {
    function manejarClickAfuera(e: MouseEvent) {
      if (contenedorRef.current && !contenedorRef.current.contains(e.target as Node)) {
        setAbierto(false);
        setBusqueda("");
      }
    }
    document.addEventListener("mousedown", manejarClickAfuera);
    return () => document.removeEventListener("mousedown", manejarClickAfuera);
  }, []);

  const agregar = (id: string) => {
    onChange([...value, id]);
    setBusqueda("");
  };

  const quitar = (id: string) => {
    onChange(value.filter((v) => v !== id));
  };

  return (
    <div className="relative" ref={contenedorRef}>
      <div
        onClick={() => {
          setAbierto(true);
          setTimeout(() => inputRef.current?.focus(), 0);
        }}
        className={`min-h-[46px] flex flex-wrap items-center gap-1.5 rounded-xl px-2.5 py-2 border text-sm cursor-text transition ${
          abierto ? "border-orange-400 ring-2 ring-orange-500/15" : "border-neutral-200 hover:border-neutral-300"
        }`}
      >
        {seleccionadas.map((o) => (
          <span
            key={o.id}
            className="inline-flex items-center gap-1 bg-orange-50 text-orange-700 text-xs font-medium px-2 py-1 rounded-full"
          >
            {o.label}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                quitar(o.id);
              }}
              className="text-orange-400 hover:text-orange-700"
            >
              ×
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={busqueda}
          onChange={(e) => {
            setBusqueda(e.target.value);
            setAbierto(true);
          }}
          onFocus={() => setAbierto(true)}
          placeholder={seleccionadas.length === 0 ? placeholder : ""}
          className="flex-1 min-w-[100px] outline-none bg-transparent"
        />
      </div>

      {abierto && (
        <div className="absolute z-50 mt-2 w-full bg-white ring-1 ring-black/5 rounded-2xl shadow-2xl overflow-hidden origin-top animate-[dropdown-in_0.15s_ease-out]">
          <div className="max-h-56 overflow-y-auto py-1">
            {visibles.length === 0 && (
              <p className="px-4 py-3 text-sm text-neutral-400">
                {opciones.length === 0
                  ? "No hay rutas en esta área"
                  : busqueda
                  ? "Sin resultados"
                  : "Ya seleccionaste todas"}
              </p>
            )}
            {visibles.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => agregar(o.id)}
                className="w-full text-left px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50 transition"
              >
                {o.label}
              </button>
            ))}
            {disponibles.length > LIMITE_VISIBLE && (
              <p className="px-4 py-2 text-xs text-neutral-400 border-t border-neutral-100">
                Seguí escribiendo para acotar ({disponibles.length - LIMITE_VISIBLE} más)
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
