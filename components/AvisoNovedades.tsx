// components/AvisoNovedades.tsx
// Aviso flotante con las novedades que el usuario todavía no vio (ver
// lib/novedades.ts). Muestra la más reciente y cuántas más hay; "Ver
// novedades" lleva a /novedades y "Entendido" lo cierra. En ambos casos
// quedan marcadas como vistas en este navegador y no vuelve a aparecer
// hasta que se publique otra. Arriba a la derecha, bajo el header, para no
// chocar con la tarjeta de domicilio del colaborador (abajo).

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Novedad } from "../lib/novedades";
import { marcarNovedadesVistas, useNovedadesVistas } from "../lib/novedadesVistas";
import { IconoNovedad, IconoX } from "./Icons";

export default function AvisoNovedades({ novedades }: { novedades: Novedad[] }) {
  const vistas = useNovedadesVistas();
  const pathname = usePathname();

  if (vistas === null || pathname === "/novedades") return null;
  const pendientes = novedades.filter((n) => !vistas.has(n.id));
  if (pendientes.length === 0) return null;

  const [principal, ...resto] = pendientes;
  const cerrar = () => marcarNovedadesVistas(pendientes.map((n) => n.id));

  return (
    <div
      role="status"
      className="fixed z-40 top-16 md:top-20 left-4 right-4 sm:left-auto sm:right-5 sm:w-[380px] animate-[dropdown-in_0.3s_cubic-bezier(0.16,1,0.3,1)]"
    >
      <div className="relative rounded-2xl bg-white/95 dark:bg-neutral-900/95 backdrop-blur ring-1 ring-black/5 dark:ring-white/10 shadow-2xl overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-orange-400 via-orange-500 to-amber-400" />

        <button
          type="button"
          onClick={cerrar}
          aria-label="Cerrar aviso de novedades"
          className="absolute top-2.5 right-2.5 p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 dark:hover:text-neutral-200 dark:hover:bg-neutral-800 transition"
        >
          <IconoX className="w-4 h-4" />
        </button>

        <div className="p-4 pt-5 flex gap-3">
          <div className="relative shrink-0">
            <span className="absolute inset-0 rounded-xl bg-orange-400/40 animate-ping" />
            <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-orange-400 to-amber-500 text-white flex items-center justify-center shadow-md">
              <IconoNovedad className="w-5 h-5" />
            </div>
          </div>

          <div className="min-w-0 pr-5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-orange-600 dark:text-orange-400">
              Novedad en la app
            </p>
            <p className="text-sm font-semibold text-neutral-900 dark:text-white leading-snug mt-0.5">{principal.titulo}</p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 line-clamp-3">{principal.descripcion}</p>
            {resto.length > 0 && (
              <p className="text-[11px] font-medium text-neutral-400 dark:text-neutral-500 mt-1.5">
                y {resto.length} novedad{resto.length === 1 ? "" : "es"} más
              </p>
            )}

            <div className="flex items-center gap-2 mt-3">
              <Link
                href="/novedades"
                onClick={cerrar}
                className="text-xs font-semibold bg-orange-500 hover:bg-orange-600 text-white px-3.5 py-1.5 rounded-lg transition shadow-sm"
              >
                Ver novedades
              </Link>
              <button
                type="button"
                onClick={cerrar}
                className="text-xs font-medium text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200 px-2.5 py-1.5 rounded-lg transition"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
