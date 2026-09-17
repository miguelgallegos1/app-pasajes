// components/CalendarioSelector.tsx
// Selector de UNA fecha (sin librerías externas). Comparte el motor de
// navegación/grilla con RangoFechasSelector vía useCalendarioMes — acá
// solo vive la parte propia: un clic elige el día y cierra.

"use client";

import { IconoCalendario } from "./Icons";
import { formatearFecha } from "../lib/fechas";
import { useCalendarioMes, fechaATexto, MESES, DIAS_SEMANA } from "./useCalendarioMes";

export default function CalendarioSelector({
  value,
  onChange,
  fechaMinima,
}: {
  value: string;
  onChange: (valor: string) => void;
  fechaMinima?: string;
}) {
  const {
    abierto, setAbierto, mesVisible, contenedorRef, celdas, fechaDeCelda,
    mesAnterior, mesSiguiente, hoyTexto, minimaComparable,
  } = useCalendarioMes({ mesInicial: value, fechaMinima });

  const elegirDia = (dia: number) => {
    const texto = fechaATexto(fechaDeCelda(dia));
    if (texto < minimaComparable) return;
    onChange(texto);
    setAbierto(false);
  };

  return (
    <div className="relative" ref={contenedorRef}>
      <button
        type="button"
        onClick={() => setAbierto((a) => !a)}
        className={`w-full flex items-center justify-between rounded-xl px-3.5 py-3 text-left text-sm
          border transition
          ${abierto ? "border-orange-400 ring-2 ring-orange-500/15" : "border-neutral-200 hover:border-neutral-300 dark:border-neutral-700 dark:hover:border-neutral-600"}
        `}
      >
        <span className={value ? "text-neutral-900 dark:text-white font-medium" : "text-neutral-400 dark:text-neutral-500"}>
          {value ? formatearFecha(value) : "Selecciona una fecha"}
        </span>
        <IconoCalendario className="w-5 h-5 text-orange-500 shrink-0" />
      </button>

      {abierto && (
        <div className="absolute z-50 mt-2 bg-white dark:bg-neutral-900 ring-1 ring-black/5 dark:ring-white/10 rounded-2xl shadow-2xl p-4 w-72 origin-top animate-[dropdown-in_0.15s_ease-out]">
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={mesAnterior}
              aria-label="Mes anterior"
              className="w-8 h-8 rounded-full hover:bg-orange-50 hover:text-orange-600 dark:hover:bg-orange-500/10 dark:hover:text-orange-400 flex items-center justify-center text-neutral-500 dark:text-neutral-400 transition"
            >
              ‹
            </button>
            <span className="font-semibold text-sm text-neutral-800 dark:text-neutral-200 tracking-tight">
              {MESES[mesVisible.getMonth()]} {mesVisible.getFullYear()}
            </span>
            <button
              type="button"
              onClick={mesSiguiente}
              aria-label="Mes siguiente"
              className="w-8 h-8 rounded-full hover:bg-orange-50 hover:text-orange-600 dark:hover:bg-orange-500/10 dark:hover:text-orange-400 flex items-center justify-center text-neutral-500 dark:text-neutral-400 transition"
            >
              ›
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-2">
            {DIAS_SEMANA.map((d, i) => (
              <div key={i} className="text-center text-[10px] font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {celdas.map((dia, i) => {
              if (dia === null) return <div key={i} />;
              const textoCelda = fechaATexto(fechaDeCelda(dia));
              const deshabilitado = textoCelda < minimaComparable;
              const esHoy = textoCelda === hoyTexto;
              const esSeleccionado = textoCelda === value;

              return (
                <button
                  key={i}
                  type="button"
                  disabled={deshabilitado}
                  onClick={() => elegirDia(dia)}
                  className={`h-9 w-9 mx-auto rounded-full text-sm font-medium transition-all
                    ${esSeleccionado ? "bg-orange-500 text-white shadow-sm shadow-orange-500/30" : ""}
                    ${!esSeleccionado && esHoy ? "ring-1 ring-orange-400 text-orange-600 dark:text-orange-400" : ""}
                    ${!esSeleccionado && !esHoy && !deshabilitado ? "hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300" : ""}
                    ${deshabilitado ? "text-neutral-300 dark:text-neutral-700 cursor-not-allowed" : ""}
                  `}
                >
                  {dia}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
