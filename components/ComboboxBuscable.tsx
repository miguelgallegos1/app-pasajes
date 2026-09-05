// components/ComboboxBuscable.tsx
// Selector desplegable con buscador integrado, estilo moderno.
// Reutilizable para cualquier lista de opciones (rutas, colaboradores, etc.)

"use client";

import { useState, useRef, useEffect } from "react";

type Opcion = { id: string; label: string };

export default function ComboboxBuscable({
  opciones,
  value,
  onChange,
  placeholder = "Selecciona una opción",
  cargando = false,
}: {
  opciones: Opcion[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  cargando?: boolean;
}) {
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const contenedorRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const opcionSeleccionada = opciones.find((o) => o.id === value);

  const opcionesFiltradas = opciones.filter((o) =>
    o.label.toLowerCase().includes(busqueda.toLowerCase())
  );

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

  const abrir = () => {
    if (cargando) return;
    setAbierto(true);
    setBusqueda("");
    // Foco automático en el buscador al abrir
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const elegir = (opcion: Opcion) => {
    onChange(opcion.id);
    setAbierto(false);
    setBusqueda("");
  };

  return (
    <div className="relative" ref={contenedorRef}>
      <button
        type="button"
        onClick={abrir}
        disabled={cargando}
        className={`w-full flex items-center justify-between rounded-xl px-3.5 py-3 text-left text-sm
          border transition disabled:opacity-50
          ${abierto ? "border-orange-400 ring-2 ring-orange-500/15" : "border-neutral-200 hover:border-neutral-300"}
        `}
      >
        <span className={opcionSeleccionada ? "text-neutral-900 font-medium" : "text-neutral-400"}>
          {cargando ? "Cargando..." : opcionSeleccionada ? opcionSeleccionada.label : placeholder}
        </span>
        <svg viewBox="0 0 24 24" className="w-4 h-4 text-neutral-400 shrink-0" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {abierto && (
        <div className="absolute z-50 mt-2 w-full bg-white ring-1 ring-black/5 rounded-2xl shadow-2xl overflow-hidden">
          {/* Buscador */}
          <div className="p-2 border-b border-neutral-100">
            <input
              ref={inputRef}
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar..."
              className="w-full px-3 py-2 text-sm rounded-lg bg-neutral-50 border border-transparent focus:border-orange-300 outline-none"
            />
          </div>

          {/* Lista de opciones */}
          <div className="max-h-56 overflow-y-auto py-1">
            {opcionesFiltradas.length === 0 && (
              <p className="px-4 py-3 text-sm text-neutral-400">Sin resultados</p>
            )}
            {opcionesFiltradas.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => elegir(o)}
                className={`w-full text-left px-4 py-2.5 text-sm transition
                  ${o.id === value ? "bg-orange-50 text-orange-700 font-medium" : "text-neutral-700 hover:bg-neutral-50"}
                `}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}