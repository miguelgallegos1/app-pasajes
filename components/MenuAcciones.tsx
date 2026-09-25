// components/MenuAcciones.tsx
// Menú "⋮" para las acciones secundarias de una fila de tabla (Editar,
// Gestionar, etc.). Antes cada fila mostraba 2-3 botones siempre visibles,
// lo que se veía recargado — sobre todo en pantallas angostas. Agrupados
// acá, la fila queda limpia y las acciones aparecen bajo demanda.
//
// El desplegable se renderiza en un portal sobre document.body con posición
// fija: así no lo recorta el overflow de la tabla y el usuario no tiene que
// hacer scroll dentro de ella para verlo. Si no entra hacia abajo, abre hacia
// arriba.

"use client";

import { useState, useRef, useEffect, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { IconoMas } from "./Icons";

export type AccionMenu = { label: string; onClick: () => void; tono?: "normal" | "peligro"; deshabilitado?: boolean };

const ANCHO_MENU = 160; // w-40
const MARGEN = 8;

export default function MenuAcciones({ acciones }: { acciones: AccionMenu[] }) {
  const [abierto, setAbierto] = useState(false);
  const botonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Se posiciona escribiendo directo en el style del menú (antes de pintar)
  // en vez de pasar por estado, para no provocar un segundo render.
  useLayoutEffect(() => {
    const boton = botonRef.current;
    const menu = menuRef.current;
    if (!abierto || !boton || !menu) return;
    const r = boton.getBoundingClientRect();
    const altoMenu = menu.offsetHeight;
    const espacioAbajo = window.innerHeight - r.bottom;
    const haciaArriba = espacioAbajo < altoMenu + MARGEN && r.top > espacioAbajo;
    menu.style.top = `${haciaArriba ? r.top - altoMenu - 4 : r.bottom + 4}px`;
    menu.style.left = `${Math.min(Math.max(MARGEN, r.right - ANCHO_MENU), window.innerWidth - ANCHO_MENU - MARGEN)}px`;
    menu.style.transformOrigin = haciaArriba ? "bottom right" : "top right";
    menu.style.visibility = "visible";
  }, [abierto]);

  useEffect(() => {
    if (!abierto) return;
    function manejarClickAfuera(e: MouseEvent) {
      const t = e.target as Node;
      if (botonRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setAbierto(false);
    }
    function manejarEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setAbierto(false);
    }
    // Con posición fija el menú quedaría "flotando" si la página o la tabla
    // se desplazan, así que se cierra.
    function cerrar() {
      setAbierto(false);
    }
    document.addEventListener("mousedown", manejarClickAfuera);
    document.addEventListener("keydown", manejarEscape);
    window.addEventListener("scroll", cerrar, true);
    window.addEventListener("resize", cerrar);
    return () => {
      document.removeEventListener("mousedown", manejarClickAfuera);
      document.removeEventListener("keydown", manejarEscape);
      window.removeEventListener("scroll", cerrar, true);
      window.removeEventListener("resize", cerrar);
    };
  }, [abierto]);

  return (
    <div className="relative inline-block">
      <button
        ref={botonRef}
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

      {abierto &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            style={{ position: "fixed", top: 0, left: 0, width: ANCHO_MENU, visibility: "hidden" }}
            className="bg-white dark:bg-neutral-900 ring-1 ring-black/5 dark:ring-white/10 rounded-xl shadow-2xl overflow-hidden animate-[dropdown-in_0.15s_ease-out] z-50 py-1"
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
          </div>,
          document.body
        )}
    </div>
  );
}
