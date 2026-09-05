// components/CalendarioSelector.tsx
// Selector de fecha moderno hecho a mano (sin librerías externas).

"use client";

import { useState, useRef, useEffect } from "react";
import { IconoCalendario } from "./Icons";

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];
const DIAS_SEMANA = ["L", "M", "M", "J", "V", "S", "D"];

function aTextoFecha(fecha: Date) {
  const año = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");
  return `${año}-${mes}-${dia}`;
}

export default function CalendarioSelector({
  value,
  onChange,
  fechaMinima,
}: {
  value: string;
  onChange: (valor: string) => void;
  fechaMinima?: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const [mesVisible, setMesVisible] = useState(() => (value ? new Date(value) : new Date()));
  const contenedorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function manejarClickAfuera(e: MouseEvent) {
      if (contenedorRef.current && !contenedorRef.current.contains(e.target as Node)) {
        setAbierto(false);
      }
    }
    document.addEventListener("mousedown", manejarClickAfuera);
    return () => document.removeEventListener("mousedown", manejarClickAfuera);
  }, []);

  const primerDiaDelMes = new Date(mesVisible.getFullYear(), mesVisible.getMonth(), 1);
  const diasEnElMes = new Date(mesVisible.getFullYear(), mesVisible.getMonth() + 1, 0).getDate();
  const offsetInicio = (primerDiaDelMes.getDay() + 6) % 7;

  const celdas: (number | null)[] = [
    ...Array(offsetInicio).fill(null),
    ...Array.from({ length: diasEnElMes }, (_, i) => i + 1),
  ];

  const hoyTexto = aTextoFecha(new Date());
  const minimaComparable = fechaMinima ?? "0000-01-01";

  const elegirDia = (dia: number) => {
    const fechaElegida = new Date(mesVisible.getFullYear(), mesVisible.getMonth(), dia);
    const texto = aTextoFecha(fechaElegida);
    if (texto < minimaComparable) return;
    onChange(texto);
    setAbierto(false);
  };

  return (
    <div className="relative" ref={contenedorRef}>
      <button
        type="button"
        onClick={() => setAbierto((a) => !a)}
        className={`w-full flex items-center justify-between rounded-xl px-3.5 py-3 text-left
          border transition
          ${abierto ? "border-orange-400 ring-2 ring-orange-500/15" : "border-neutral-200 hover:border-neutral-300"}
        `}
      >
        <span className={value ? "text-neutral-900 font-medium" : "text-neutral-400"}>
          {value
            ? new Date(value).toLocaleDateString("es-EC", { day: "numeric", month: "long", year: "numeric" })
            : "Selecciona una fecha"}
        </span>
        <IconoCalendario className="w-5 h-5 text-orange-500 shrink-0" />
      </button>

      {abierto && (
        <div className="absolute z-50 mt-2 bg-white ring-1 ring-black/5 rounded-2xl shadow-2xl p-4 w-72 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={() => setMesVisible(new Date(mesVisible.getFullYear(), mesVisible.getMonth() - 1, 1))}
              className="w-8 h-8 rounded-full hover:bg-orange-50 hover:text-orange-600 flex items-center justify-center text-neutral-500 transition"
            >
              ‹
            </button>
            <span className="font-semibold text-sm text-neutral-800 tracking-tight">
              {MESES[mesVisible.getMonth()]} {mesVisible.getFullYear()}
            </span>
            <button
              type="button"
              onClick={() => setMesVisible(new Date(mesVisible.getFullYear(), mesVisible.getMonth() + 1, 1))}
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
              const fechaCelda = new Date(mesVisible.getFullYear(), mesVisible.getMonth(), dia);
              const textoCelda = aTextoFecha(fechaCelda);
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