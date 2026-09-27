// components/RangoFechasSelector.tsx
// Selector de RANGO de fechas: un solo calendario donde se elige Desde y
// Hasta con dos clics, en vez de dos CalendarioSelector separados. Comparte
// el motor de navegación/grilla con CalendarioSelector vía useCalendarioMes
// — acá solo vive la parte propia: dos clics arman el rango.

"use client";

import { useState, useMemo } from "react";
import { IconoCalendario } from "./Icons";
import { formatearFecha } from "../lib/fechas";
import { useCalendarioMes, fechaATexto, MESES, DIAS_SEMANA } from "./useCalendarioMes";

export default function RangoFechasSelector({
  desde,
  hasta,
  onChange,
  fechaMinima,
}: {
  desde: string;
  hasta: string;
  onChange: (desde: string, hasta: string) => void;
  fechaMinima?: string;
}) {
  // Mientras se elige el segundo clic (el "hasta"), acá va guardado el
  // "desde" ya confirmado — es lo que distingue "primer clic" de "segundo
  // clic" sin depender de si el padre ya actualizó sus props todavía.
  const [desdeElegido, setDesdeElegido] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);

  const limpiarSeleccionEnCurso = () => {
    setDesdeElegido(null);
    setHover(null);
  };

  const {
    abierto, setAbierto, mesVisible, setMesVisible, contenedorRef, celdas, fechaDeCelda,
    mesAnterior, mesSiguiente, hoyTexto, minimaComparable,
  } = useCalendarioMes({ mesInicial: desde, fechaMinima, alCerrar: limpiarSeleccionEnCurso });

  const abrir = () => {
    setAbierto(true);
    limpiarSeleccionEnCurso();
    setMesVisible(desde ? new Date(desde) : new Date());
  };

  // Extremos del rango que se está mostrando: el confirmado (desde/hasta
  // que llegan por props) mientras no se tocó nada, o el que se está
  // armando en vivo (desdeElegido + hover) durante el segundo clic.
  const inicioMostrado = desdeElegido ?? desde;
  const finMostrado = desdeElegido ? hover ?? desdeElegido : hasta;
  const [rangoDesde, rangoHasta] =
    inicioMostrado && finMostrado && inicioMostrado <= finMostrado
      ? [inicioMostrado, finMostrado]
      : [finMostrado, inicioMostrado];

  const elegirDia = (dia: number) => {
    const texto = fechaATexto(fechaDeCelda(dia));
    if (texto < minimaComparable) return;

    if (!desdeElegido) {
      // Primer clic: arranca un rango nuevo (pisa el anterior).
      setDesdeElegido(texto);
      setHover(null);
      return;
    }

    // Segundo clic: cierra el rango con el que quedó más temprano como
    // inicio, sin importar el orden en que se hizo clic.
    const [finalDesde, finalHasta] = texto < desdeElegido ? [texto, desdeElegido] : [desdeElegido, texto];
    onChange(finalDesde, finalHasta);
    setAbierto(false);
    limpiarSeleccionEnCurso();
  };

  const etiqueta = useMemo(() => {
    if (!desde || !hasta) return "Selecciona un rango";
    if (desde === hasta) return formatearFecha(desde);
    return `${formatearFecha(desde)} — ${formatearFecha(hasta)}`;
  }, [desde, hasta]);

  return (
    <div className="relative" ref={contenedorRef}>
      <button
        type="button"
        onClick={() => (abierto ? setAbierto(false) : abrir())}
        className={`w-full flex items-center justify-between rounded-xl px-3.5 py-3 text-left text-sm
          border transition
          ${abierto ? "border-orange-400 ring-2 ring-orange-500/15" : "border-neutral-200 hover:border-neutral-300 dark:border-neutral-700 dark:hover:border-neutral-600"}
        `}
      >
        <span className={desde && hasta ? "text-neutral-900 dark:text-white font-medium" : "text-neutral-400 dark:text-neutral-500"}>{etiqueta}</span>
        <IconoCalendario className="w-5 h-5 text-orange-500 shrink-0" />
      </button>

      {abierto && (
        <div className="absolute z-50 mt-2 bg-white dark:bg-neutral-900 ring-1 ring-black/5 dark:ring-white/10 rounded-2xl shadow-2xl p-4 w-72 origin-top animate-[dropdown-in_0.15s_ease-out]">
          <div className="flex items-center justify-between mb-3">
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

          <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mb-2 text-center">
            {desdeElegido ? "Elegir el día final" : "Elegir el día inicial"}
          </p>

          <div className="grid grid-cols-7 gap-1 mb-2">
            {DIAS_SEMANA.map((d, i) => (
              <div key={i} className="text-center text-[10px] font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-y-1">
            {celdas.map((dia, i) => {
              if (dia === null) return <div key={i} />;
              const textoCelda = fechaATexto(fechaDeCelda(dia));
              const deshabilitado = textoCelda < minimaComparable;
              const esHoy = textoCelda === hoyTexto;
              const esInicio = textoCelda === rangoDesde;
              const esFin = textoCelda === rangoHasta;
              const enRango = !!rangoDesde && !!rangoHasta && textoCelda > rangoDesde && textoCelda < rangoHasta;

              return (
                <div
                  key={i}
                  onMouseEnter={() => desdeElegido && setHover(textoCelda)}
                  className={enRango || esInicio || esFin ? "bg-orange-50 dark:bg-orange-500/10" : ""}
                  style={{
                    borderTopLeftRadius: esInicio ? "9999px" : 0,
                    borderBottomLeftRadius: esInicio ? "9999px" : 0,
                    borderTopRightRadius: esFin ? "9999px" : 0,
                    borderBottomRightRadius: esFin ? "9999px" : 0,
                  }}
                >
                  <button
                    type="button"
                    disabled={deshabilitado}
                    onClick={() => elegirDia(dia)}
                    className={`h-9 w-9 mx-auto rounded-full text-sm font-medium transition-all block
                      ${esInicio || esFin ? "bg-orange-500 text-white shadow-sm shadow-orange-500/30" : ""}
                      ${!esInicio && !esFin && esHoy ? "ring-1 ring-orange-400 text-orange-600 dark:text-orange-400" : ""}
                      ${!esInicio && !esFin && !esHoy && !deshabilitado ? "hover:bg-orange-100 dark:hover:bg-orange-500/20 text-neutral-700 dark:text-neutral-300" : ""}
                      ${deshabilitado ? "text-neutral-300 dark:text-neutral-700 cursor-not-allowed" : ""}
                    `}
                  >
                    {dia}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
