// components/NotificacionesMenu.tsx
// Campanita del header: se pide UNA sola vez al montar AppShell (que vive
// en el layout y no se remonta entre navegaciones), nunca en cada clic del
// menú. Reutiliza los mismos colores/íconos que la tarjeta del Dashboard
// (AlertaPendientes) para que ambos lugares se vean como la misma alerta.

"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { IconoCampana } from "./Icons";
import { TEMAS } from "./AlertaPendientes";
import type { AlertaPendiente } from "../lib/alertasPendientes";

const ROLES_CON_ALERTA = new Set(["ADMIN_TH", "COORDINADOR", "NOMINA"]);

export default function NotificacionesMenu({ rol }: { rol: string }) {
  const [alerta, setAlerta] = useState<AlertaPendiente | null>(null);
  const [abierto, setAbierto] = useState(false);
  const contenedorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ROLES_CON_ALERTA.has(rol)) return;
    let cancelado = false;
    fetch("/api/dashboard/pendientes-accion")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelado && data) setAlerta(data.alerta);
      })
      .catch(() => {});
    return () => {
      cancelado = true;
    };
  }, [rol]);

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

  if (!ROLES_CON_ALERTA.has(rol)) return null;

  const hayAlerta = !!alerta;
  const tema = alerta ? TEMAS[alerta.estado] : null;

  return (
    <div className="relative" ref={contenedorRef}>
      <button
        onClick={() => setAbierto((a) => !a)}
        title="Notificaciones"
        aria-label={hayAlerta ? "Notificaciones (hay pendientes)" : "Notificaciones"}
        aria-haspopup="true"
        aria-expanded={abierto}
        className="relative text-neutral-500 hover:text-orange-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:text-orange-400 dark:hover:bg-neutral-800 p-2 rounded-lg transition"
      >
        <IconoCampana className="w-[18px] h-[18px]" />
        {hayAlerta && (
          <span className="absolute top-1 right-1 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
          </span>
        )}
      </button>

      {abierto && (
        <div className="fixed left-1/2 -translate-x-1/2 top-16 w-[calc(100vw-2rem)] max-w-xs sm:absolute sm:left-auto sm:translate-x-0 sm:top-auto sm:right-0 sm:mt-2 sm:w-72 sm:max-w-none bg-white dark:bg-neutral-900 ring-1 ring-black/5 dark:ring-white/10 rounded-2xl shadow-2xl overflow-hidden origin-top animate-[dropdown-in_0.15s_ease-out] z-40">
          {!alerta || !tema ? (
            <p className="px-4 py-8 text-sm text-neutral-400 dark:text-neutral-500 text-center">Estás al día — nada pendiente.</p>
          ) : (
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-2.5">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${tema.badge}`}>
                  <tema.icono className="w-[18px] h-[18px]" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-neutral-900 dark:text-white">
                    {alerta.total} {alerta.total === 1 ? "solicitud" : "solicitudes"}
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">{tema.titulo}</p>
                </div>
              </div>

              {alerta.desglose.length > 0 && (
                <div className="space-y-1 max-h-40 overflow-y-auto border-t border-neutral-100 dark:border-neutral-800 pt-2">
                  {alerta.desglose.map((d) => (
                    <div key={d.etiqueta} className="flex items-center justify-between gap-2 text-xs">
                      <span className="text-neutral-500 dark:text-neutral-400 truncate">{d.etiqueta}</span>
                      <span className="font-semibold text-neutral-700 dark:text-neutral-200 shrink-0">{d.cantidad}</span>
                    </div>
                  ))}
                </div>
              )}

              <Link
                href={alerta.href}
                onClick={() => setAbierto(false)}
                className={`block text-center text-xs font-semibold px-3 py-2.5 rounded-xl transition ${tema.boton}`}
              >
                {tema.accion}
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
