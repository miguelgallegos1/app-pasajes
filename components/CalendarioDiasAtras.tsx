// components/CalendarioDiasAtras.tsx
// Calendario fijo (no desplegable) para el parámetro "días atrás" de
// Admin -> Parámetros. En vez de escribir un número, se toca el día más
// antiguo que se quiere permitir y se calcula cuántos días atrás es desde
// hoy. Pinta el tramo permitido (de ese día hasta hoy) para que se vea de
// un vistazo qué días quedan habilitados.
//
// Ojo: el parámetro sigue siendo RELATIVO (N días antes de hoy), no una
// fecha fija — mañana el tramo se corre un día. Por eso el texto de abajo
// lo aclara, y el calendario siempre se calcula contra el "hoy" del
// navegador.

"use client";

import { useState } from "react";
import { MESES, DIAS_SEMANA } from "./useCalendarioMes";

const DIA_MS = 24 * 60 * 60 * 1000;
const NOMBRE_DIA = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

// Días de calendario entre dos fechas locales, sin que la hora del día
// (ni un posible cambio de horario) mueva el resultado.
function diasEntre(desde: Date, hasta: Date): number {
  const a = Date.UTC(desde.getFullYear(), desde.getMonth(), desde.getDate());
  const b = Date.UTC(hasta.getFullYear(), hasta.getMonth(), hasta.getDate());
  return Math.round((b - a) / DIA_MS);
}

function textoLargo(fecha: Date): string {
  return `${NOMBRE_DIA[fecha.getDay()]} ${fecha.getDate()} de ${MESES[fecha.getMonth()].toLowerCase()}`;
}

export default function CalendarioDiasAtras({
  diasAtras,
  onCambiar,
  maximo = 365,
}: {
  diasAtras: number;
  onCambiar: (dias: number) => void;
  maximo?: number;
}) {
  // Solo se monta en el cliente, después de cargar los parámetros (ver
  // PanelParametros), así que "hoy" puede calcularse al render sin
  // riesgo de que no coincida con el HTML del servidor.
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const minima = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - diasAtras);

  // Arranca mostrando el mes del día mínimo (si está en el mes pasado,
  // se ve ese mes, no el actual).
  const [mesVisible, setMesVisible] = useState(() => new Date(minima.getFullYear(), minima.getMonth(), 1));

  const primerDia = new Date(mesVisible.getFullYear(), mesVisible.getMonth(), 1);
  const diasEnElMes = new Date(mesVisible.getFullYear(), mesVisible.getMonth() + 1, 0).getDate();
  const offsetInicio = (primerDia.getDay() + 6) % 7;
  const celdas: (number | null)[] = [
    ...Array(offsetInicio).fill(null),
    ...Array.from({ length: diasEnElMes }, (_, i) => i + 1),
  ];

  const esMesActual = mesVisible.getFullYear() === hoy.getFullYear() && mesVisible.getMonth() === hoy.getMonth();
  const limiteAtras = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - maximo);
  const puedeIrAtras = mesVisible > new Date(limiteAtras.getFullYear(), limiteAtras.getMonth(), 1);

  const cambiarMes = (delta: number) =>
    setMesVisible(new Date(mesVisible.getFullYear(), mesVisible.getMonth() + delta, 1));

  const atajos = [0, 1, 2, 7];

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800/60 p-3">
        <div className="flex items-center justify-between mb-2">
          <button
            type="button"
            onClick={() => cambiarMes(-1)}
            disabled={!puedeIrAtras}
            aria-label="Mes anterior"
            className="w-7 h-7 rounded-full flex items-center justify-center text-neutral-500 dark:text-neutral-400 hover:bg-orange-50 hover:text-orange-600 dark:hover:bg-orange-500/10 dark:hover:text-orange-400 disabled:opacity-30 disabled:pointer-events-none transition"
          >
            ‹
          </button>
          <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
            {MESES[mesVisible.getMonth()]} {mesVisible.getFullYear()}
          </span>
          <button
            type="button"
            onClick={() => cambiarMes(1)}
            disabled={esMesActual}
            aria-label="Mes siguiente"
            className="w-7 h-7 rounded-full flex items-center justify-center text-neutral-500 dark:text-neutral-400 hover:bg-orange-50 hover:text-orange-600 dark:hover:bg-orange-500/10 dark:hover:text-orange-400 disabled:opacity-30 disabled:pointer-events-none transition"
          >
            ›
          </button>
        </div>

        <div className="grid grid-cols-7 mb-1">
          {DIAS_SEMANA.map((d, i) => (
            <div key={i} className="text-center text-[10px] font-semibold uppercase text-neutral-400 dark:text-neutral-500">
              {d}
            </div>
          ))}
        </div>

        {/* Sin gap horizontal: así el tramo permitido se ve como una banda
            continua de un día al otro, no como círculos sueltos. */}
        <div className="grid grid-cols-7 gap-y-1">
          {celdas.map((dia, i) => {
            if (dia === null) return <div key={i} />;
            const fecha = new Date(mesVisible.getFullYear(), mesVisible.getMonth(), dia);
            const atras = diasEntre(fecha, hoy); // >0 pasado, 0 hoy, <0 futuro
            const esFuturo = atras < 0;
            const fueraDeRango = atras > maximo;
            const esMinima = atras === diasAtras;
            const esHoy = atras === 0;
            const enTramo = atras >= 0 && atras <= diasAtras;
            // Bordes redondeados de la banda: en sus extremos y al cortar
            // de semana (lunes / domingo).
            const columna = (offsetInicio + dia - 1) % 7;
            const inicioBanda = esMinima || columna === 0;
            const finBanda = esHoy || columna === 6;

            return (
              <div
                key={i}
                className={`flex justify-center ${enTramo && !(esMinima && esHoy) ? "bg-orange-100/70 dark:bg-orange-500/15" : ""} ${
                  enTramo && inicioBanda ? "rounded-l-full" : ""
                } ${enTramo && finBanda ? "rounded-r-full" : ""}`}
              >
                <button
                  type="button"
                  disabled={esFuturo || fueraDeRango}
                  onClick={() => onCambiar(atras)}
                  title={esFuturo ? "Los días que vienen siempre se pueden elegir" : `${atras} día${atras === 1 ? "" : "s"} atrás`}
                  aria-label={`${dia} de ${MESES[mesVisible.getMonth()]}${esMinima ? ", día más antiguo permitido" : ""}`}
                  aria-pressed={esMinima}
                  className={`h-8 w-8 rounded-full text-xs font-medium transition ${
                    esMinima
                      ? "bg-orange-500 text-white shadow-sm shadow-orange-500/30"
                      : esHoy
                      ? "ring-1 ring-orange-400 text-orange-700 dark:text-orange-300 font-semibold"
                      : enTramo
                      ? "text-orange-800 dark:text-orange-200 hover:bg-orange-200/70 dark:hover:bg-orange-500/25"
                      : esFuturo
                      ? "text-neutral-400 dark:text-neutral-500 cursor-default"
                      : fueraDeRango
                      ? "text-neutral-300 dark:text-neutral-700 cursor-not-allowed"
                      : "text-neutral-600 dark:text-neutral-300 hover:bg-orange-50 hover:text-orange-700 dark:hover:bg-orange-500/10 dark:hover:text-orange-300"
                  }`}
                >
                  {dia}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {atajos.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => {
              onCambiar(n);
              const dia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - n);
              setMesVisible(new Date(dia.getFullYear(), dia.getMonth(), 1));
            }}
            className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition ${
              diasAtras === n
                ? "bg-orange-500 border-orange-500 text-white"
                : "border-neutral-200 text-neutral-600 hover:border-orange-300 hover:text-orange-700 dark:border-neutral-700 dark:text-neutral-300 dark:hover:border-orange-500/40 dark:hover:text-orange-300"
            }`}
          >
            {n === 0 ? "Solo hoy" : n === 1 ? "Desde ayer" : `${n} días`}
          </button>
        ))}
      </div>

      <div className="rounded-lg bg-orange-50 dark:bg-orange-500/10 px-3 py-2 text-[11px] leading-relaxed text-orange-900 dark:text-orange-200">
        {diasAtras === 0 ? (
          <>Solo se puede registrar desde <b>hoy</b> en adelante.</>
        ) : (
          <>
            Hoy se puede registrar desde el <b>{textoLargo(minima)}</b> ({diasAtras} día{diasAtras === 1 ? "" : "s"} atrás).
          </>
        )}
        <span className="block text-orange-800/70 dark:text-orange-200/70">
          El límite se mueve cada día: siempre son {diasAtras} día{diasAtras === 1 ? "" : "s"} antes de la fecha de hoy.
        </span>
      </div>
    </div>
  );
}
