// components/AvisoRechazadas.tsx
// Aviso flotante en Mis Pasajes mientras haya solicitudes RECHAZADAS sin
// corregir: aparece SIEMPRE (en cada visita) mientras exista al menos una,
// y explica qué hacer (corregir fecha y ruta, o eliminarla). Se puede
// minimizar a una pastilla con el número, pero no desaparece hasta que ya
// no quede ninguna. Sale de los datos que la pantalla ya cargó: no hace
// consultas propias.

"use client";

import { useState } from "react";
import { IconoAlerta, IconoX } from "./Icons";

export default function AvisoRechazadas({
  cantidad,
  deEquipo,
  mostrandoSoloRechazadas,
  onVer,
}: {
  cantidad: number;
  // Supervisor: incluye las de su equipo.
  deEquipo: boolean;
  mostrandoSoloRechazadas: boolean;
  onVer: () => void;
}) {
  const [minimizado, setMinimizado] = useState(false);
  if (cantidad === 0) return null;

  const texto = cantidad === 1 ? "1 solicitud rechazada" : `${cantidad} solicitudes rechazadas`;
  // Abajo a la izquierda del contenido (a la derecha del menú lateral en
  // escritorio), para no chocar con la tarjeta de domicilio ni con el
  // aviso de novedades; en móvil, arriba bajo el header.
  const posicion = "fixed z-30 top-16 left-4 right-4 md:top-auto md:right-auto md:bottom-5 md:left-[calc(15rem+1.25rem)]";

  if (minimizado) {
    return (
      <button
        type="button"
        onClick={() => setMinimizado(false)}
        className={`${posicion} md:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-4 py-2 shadow-lg animate-[dropdown-in_0.2s_ease-out]`}
      >
        <IconoAlerta className="w-4 h-4" /> {texto}
      </button>
    );
  }

  return (
    <div role="alert" className={`${posicion} md:w-[400px] animate-[panel-in_0.35s_cubic-bezier(0.16,1,0.3,1)]`}>
      <div className="relative rounded-2xl bg-white dark:bg-neutral-900 ring-1 ring-red-500/20 shadow-2xl overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-1 bg-red-500" />
        <button
          type="button"
          onClick={() => setMinimizado(true)}
          aria-label="Minimizar aviso"
          title="Minimizar"
          className="absolute top-2.5 right-2.5 p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 dark:hover:text-neutral-200 dark:hover:bg-neutral-800 transition"
        >
          <IconoX className="w-4 h-4" />
        </button>

        <div className="p-4 pt-5 flex gap-3">
          <div className="shrink-0 w-10 h-10 rounded-xl bg-red-100 dark:bg-red-500/15 text-red-600 dark:text-red-400 flex items-center justify-center">
            <IconoAlerta className="w-5 h-5" />
          </div>
          <div className="min-w-0 pr-5">
            <p className="text-sm font-semibold text-neutral-900 dark:text-white">
              {deEquipo ? `Tu equipo tiene ${texto}` : `Tienes ${texto}`}
            </p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              Talento Humano {cantidad === 1 ? "la devolvió" : "las devolvió"} para corregir. Edítala{cantidad === 1 ? "" : "s"} y
              corrige la <strong>fecha</strong> y la <strong>ruta</strong>, o elimína{cantidad === 1 ? "la" : "las"} si ya no
              corresponde{cantidad === 1 ? "" : "n"}. Mientras no se corrijan, no se pagan.
            </p>
            {!mostrandoSoloRechazadas && (
              <button
                type="button"
                onClick={onVer}
                className="mt-3 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white px-3.5 py-1.5 rounded-lg transition shadow-sm"
              >
                Ver rechazadas
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
