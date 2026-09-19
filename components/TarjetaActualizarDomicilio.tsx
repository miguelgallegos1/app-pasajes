// components/TarjetaActualizarDomicilio.tsx
// Tarjeta flotante para colaborador/supervisor: recordatorio de que, si su
// domicilio cambió y sus rutas asignadas ya no corresponden, tiene que
// acercarse a Talento Humano para que se las actualicen. La app no guarda
// el domicilio del colaborador (solo la dirección del sitio productivo),
// así que no hay forma de detectar el desfase automáticamente — es un
// aviso informativo, no una alerta basada en datos reales.
// Se puede cerrar; vuelve a aparecer solo pasados RECORDATORIO_DIAS, como
// recordatorio periódico en vez de desaparecer para siempre.

"use client";

import { useState } from "react";
import { IconoUbicacion, IconoX } from "./Icons";

const CLAVE_OCULTA = "app-pasajes:aviso-domicilio-oculto-hasta";
const RECORDATORIO_DIAS = 30;

function vigente(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const guardado = localStorage.getItem(CLAVE_OCULTA);
    if (!guardado) return false;
    return Date.now() < Number(guardado);
  } catch {
    return false;
  }
}

export default function TarjetaActualizarDomicilio() {
  const [oculta, setOculta] = useState(vigente);

  if (oculta) return null;

  const cerrar = () => {
    setOculta(true);
    try {
      localStorage.setItem(CLAVE_OCULTA, String(Date.now() + RECORDATORIO_DIAS * 24 * 60 * 60 * 1000));
    } catch {
      // Sin localStorage (privado/bloqueado) simplemente no se recuerda
      // entre sesiones — no rompe nada, solo vuelve a aparecer antes.
    }
  };

  return (
    <div className="fixed z-40 bottom-4 left-4 right-4 sm:left-auto sm:right-5 sm:bottom-5 sm:w-[360px] animate-[panel-in_0.35s_cubic-bezier(0.16,1,0.3,1)]">
      <div className="relative rounded-2xl bg-white dark:bg-neutral-900 ring-1 ring-black/5 dark:ring-white/10 shadow-2xl overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-orange-400 via-orange-500 to-amber-400" />

        <button
          type="button"
          onClick={cerrar}
          aria-label="Cerrar aviso"
          className="absolute top-2.5 right-2.5 p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 dark:hover:text-neutral-200 dark:hover:bg-neutral-800 transition"
        >
          <IconoX className="w-4 h-4" />
        </button>

        <div className="p-4 pt-5 flex gap-3">
          <div className="relative shrink-0">
            <span className="absolute inset-0 rounded-full bg-orange-400/40 dark:bg-orange-500/30 animate-ping" />
            <div className="relative w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 text-white flex items-center justify-center shadow-md shadow-orange-500/30">
              <IconoUbicacion className="w-5 h-5" />
            </div>
          </div>
          <div className="min-w-0 pr-5">
            <p className="text-sm font-bold text-neutral-900 dark:text-white">¿Cambiaste de domicilio?</p>
            <p className="mt-1 text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
              Verifica que tus rutas asignadas correspondan a tu domicilio actual. Si no, acércate a{" "}
              <span className="font-semibold text-neutral-700 dark:text-neutral-300">Talento Humano</span> para
              actualizarlas.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
