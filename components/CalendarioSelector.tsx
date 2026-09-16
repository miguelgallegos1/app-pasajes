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
          ${abierto ? "border-orange-400 ring-2 ring-orange-500/15" : "border-neutral-200 hover:border-neutral-300"}
        `}
      >
        <span className={value ? "text-neutral-900 font-medium" : "text-neutral-400"}>
          {value ? formatearFecha(value) : "Selecciona una fecha"}
        </span>
        <IconoCalendario className="w-5 h-5 text-orange-500 shrink-0" />
      </button>

      {abierto && (
        <div className="absolute z-50 mt-2 bg-white ring-1 ring-black/5 rounded-2xl shadow-2xl p-4 w-72 origin-top animate-[dropdown-in_0.15s_ease-out]">
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={mesAnterior}
              className="w-8 h-8 rounded-full hover:bg-orange-50 hover:text-orange-600 flex items-center justify-center text-neutral-500 transition"
            >
              ‹
            </button>
            <span className="font-semibold text-sm text-neutral-800 tracking-tight">
              {MESES[mesVisible.getMonth()]} {mesVisible.getFullYear()}
            </span>
            <button
              type="button"
              onClick={mesSiguiente}
              className="w-8 h-8 rounded-full hover:bg-orange-50 hover:text-orange-600 flex items-center justify-center text-neutral-500 transition"
            >
              ›
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-2">
            {DIAS_SEMANA.map((d, i) => (
              <div key={i} className="text-center text-[10px] font-semibold uppercase tracking-wide text-neutral-400">
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
                    ${!esSeleccionado && esHoy ? "ring-1 ring-orange-400 text-orange-600" : ""}
                    ${!esSeleccionado && !esHoy && !deshabilitado ? "hover:bg-neutral-100 text-neutral-700" : ""}
                    ${deshabilitado ? "text-neutral-300 cursor-not-allowed" : ""}
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
