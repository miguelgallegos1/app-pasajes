// components/MenuExportar.tsx
// Botón "Exportar ▾" de los historiales: un solo botón que abre las
// opciones de salida (Excel, Imprimir...) en vez de un botón por cada una.
// En celular muestra solo el ícono. Se cierra al elegir, con clic afuera o
// con Escape.

"use client";

import { useEffect, useRef, useState, type ReactElement } from "react";
import { IconoDescargar, IconoChevron } from "./Icons";

export type OpcionExportar = {
  etiqueta: string;
  href: string;
  icono: (props: { className?: string }) => ReactElement;
  deshabilitado?: boolean;
  // Por qué está deshabilitada, o qué hace.
  detalle?: string;
  nuevaPestana?: boolean;
};

export default function MenuExportar({ opciones }: { opciones: OpcionExportar[] }) {
  const [abierto, setAbierto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const hayAlguna = opciones.some((o) => !o.deshabilitado);

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
        aria-label="Exportar"
        title={hayAlguna ? "Exportar" : "Busca primero: no hay resultados para exportar"}
        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-neutral-300 bg-white px-3 text-sm font-semibold text-neutral-800 transition hover:border-orange-400 hover:text-orange-700 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:text-orange-400 sm:px-4"
      >
        <IconoDescargar className="w-4 h-4" />
        <span className="hidden sm:inline">Exportar</span>
        <IconoChevron className={`hidden sm:block w-3.5 h-3.5 transition-transform ${abierto ? "-rotate-90" : "rotate-90"}`} />
      </button>

      {abierto && (
        <div
          role="menu"
          className="absolute right-0 z-40 mt-2 w-64 origin-top-right overflow-hidden rounded-2xl bg-white py-1.5 shadow-2xl ring-1 ring-black/5 animate-[dropdown-in_0.15s_ease-out] dark:bg-neutral-900 dark:ring-white/10"
        >
          {opciones.map((o) => {
            const Icono = o.icono;
            const contenido = (
              <>
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${o.deshabilitado ? "bg-neutral-100 text-neutral-300 dark:bg-neutral-800 dark:text-neutral-600" : "bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400"}`}>
                  <Icono className="w-4 h-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">{o.etiqueta}</span>
                  {o.detalle && <span className="block text-[11px] leading-snug text-neutral-500 dark:text-neutral-400">{o.detalle}</span>}
                </span>
              </>
            );
            return o.deshabilitado ? (
              <div key={o.etiqueta} role="menuitem" aria-disabled="true" className="flex cursor-not-allowed items-center gap-3 px-3 py-2 text-neutral-400 dark:text-neutral-500">
                {contenido}
              </div>
            ) : (
              <a
                key={o.etiqueta}
                role="menuitem"
                href={o.href}
                onClick={() => setAbierto(false)}
                {...(o.nuevaPestana ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                className="flex items-center gap-3 px-3 py-2 text-neutral-800 transition hover:bg-neutral-50 dark:text-neutral-100 dark:hover:bg-neutral-800"
              >
                {contenido}
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
