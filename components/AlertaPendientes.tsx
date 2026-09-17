// components/AlertaPendientes.tsx
// Tarjeta flotante que avisa a TH/Coordinación/Nómina cuánto le falta
// resolver en su próximo paso (Aprobar/Revisar/Pagar), con desglose por
// Empresa · Sitio · Área cuando el alcance cubre más de una. No aparece
// si no hay nada pendiente (sin ruido quan todo está al día).

"use client";

import { useState } from "react";
import { formatearMoneda } from "../lib/formato";
import Link from "next/link";
import { IconoCampana, IconoCheck, IconoLupa, IconoDinero, IconoChevron } from "./Icons";
import type { AlertaPendiente } from "../lib/alertasPendientes";

export const TEMAS: Record<
  AlertaPendiente["estado"],
  {
    titulo: string;
    accion: string;
    icono: typeof IconoCheck;
    fondo: string;
    anillo: string;
    badge: string;
    texto: string;
    boton: string;
  }
> = {
  PENDIENTE: {
    titulo: "pendiente de aprobar",
    accion: "Ir a Aprobaciones",
    icono: IconoCheck,
    fondo: "bg-amber-50 dark:bg-amber-500/10",
    anillo: "ring-amber-200 dark:ring-amber-500/30",
    badge: "bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400",
    texto: "text-amber-900 dark:text-amber-300",
    boton: "bg-amber-500 hover:bg-amber-600 text-white",
  },
  APROBADA: {
    titulo: "pendiente de revisar",
    accion: "Ir a Revisión",
    icono: IconoLupa,
    fondo: "bg-green-50 dark:bg-green-500/10",
    anillo: "ring-green-200 dark:ring-green-500/30",
    badge: "bg-green-100 text-green-600 dark:bg-green-500/20 dark:text-green-400",
    texto: "text-green-900 dark:text-green-300",
    boton: "bg-green-600 hover:bg-green-700 text-white",
  },
  REVISADO: {
    titulo: "pendiente de pagar",
    accion: "Ir a Pagos",
    icono: IconoDinero,
    fondo: "bg-sky-50 dark:bg-sky-500/10",
    anillo: "ring-sky-200 dark:ring-sky-500/30",
    badge: "bg-sky-100 text-sky-600 dark:bg-sky-500/20 dark:text-sky-400",
    texto: "text-sky-900 dark:text-sky-300",
    boton: "bg-sky-600 hover:bg-sky-700 text-white",
  },
};

export default function AlertaPendientes({ alerta }: { alerta: AlertaPendiente | null }) {
  const [abierto, setAbierto] = useState(false);
  if (!alerta) return null;

  const tema = TEMAS[alerta.estado];
  const Icono = tema.icono;

  return (
    <div
      className={`relative rounded-2xl p-4 sm:p-5 shadow-lg ring-1 ${tema.fondo} ${tema.anillo} animate-[dropdown-in_0.2s_ease-out]`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="relative shrink-0">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${tema.badge}`}>
            <Icono className="w-6 h-6" />
          </div>
          <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-red-500 ring-2 ring-white dark:ring-neutral-900" />
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <IconoCampana className={`w-3.5 h-3.5 ${tema.texto} opacity-70 shrink-0`} />
            <p className={`text-xs font-semibold uppercase tracking-wide ${tema.texto} opacity-80`}>Atención</p>
          </div>
          <p className={`text-sm sm:text-base font-bold ${tema.texto} mt-0.5`}>
            <span className="text-xl sm:text-2xl tabular-nums">{alerta.total}</span>{" "}
            {alerta.total === 1 ? "solicitud" : "solicitudes"} {tema.titulo}
            {alerta.monto > 0 && <span className="font-normal opacity-80"> · {formatearMoneda(alerta.monto)}</span>}
          </p>

          {alerta.desglose.length > 0 && (
            <button
              type="button"
              onClick={() => setAbierto((a) => !a)}
              className={`mt-1 inline-flex items-center gap-1 text-xs font-medium ${tema.texto} opacity-80 hover:opacity-100 transition`}
            >
              Ver por área
              <IconoChevron className={`w-3 h-3 transition-transform ${abierto ? "rotate-90" : ""}`} />
            </button>
          )}
        </div>

        <Link
          href={alerta.href}
          className={`shrink-0 text-center text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-xl transition shadow-sm hover:shadow-md ${tema.boton}`}
        >
          {tema.accion}
        </Link>
      </div>

      {abierto && alerta.desglose.length > 0 && (
        <div className="mt-3 pt-3 border-t border-black/5 dark:border-white/10 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          {alerta.desglose.map((d) => (
            <div key={d.etiqueta} className="flex items-center justify-between gap-2 text-xs">
              <span className={`${tema.texto} opacity-80 truncate`}>{d.etiqueta}</span>
              <span className={`font-semibold ${tema.texto} shrink-0`}>{d.cantidad}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
