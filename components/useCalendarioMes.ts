// components/useCalendarioMes.ts
// Motor compartido entre CalendarioSelector (fecha única) y
// RangoFechasSelector (rango): navegación de mes, grilla de días, clic
// afuera para cerrar, y los textos de "hoy"/mínima ya comparables. Cada
// componente solo pone su propia lógica de qué pasa al hacer clic en un
// día y cómo se pinta cada celda — todo lo demás vive acá una sola vez.

import { useState, useRef, useEffect } from "react";
import { fechaATexto, fechaHoyTexto } from "../lib/fechas";

export const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];
export const DIAS_SEMANA = ["L", "M", "M", "J", "V", "S", "D"];

export function useCalendarioMes({
  mesInicial,
  fechaMinima,
  alCerrar,
}: {
  mesInicial?: string;
  fechaMinima?: string;
  alCerrar?: () => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const [mesVisible, setMesVisible] = useState(() => (mesInicial ? new Date(mesInicial) : new Date()));
  const contenedorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function manejarClickAfuera(e: MouseEvent) {
      if (contenedorRef.current && !contenedorRef.current.contains(e.target as Node)) {
        setAbierto(false);
        alCerrar?.();
      }
    }
    document.addEventListener("mousedown", manejarClickAfuera);
    return () => document.removeEventListener("mousedown", manejarClickAfuera);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const primerDiaDelMes = new Date(mesVisible.getFullYear(), mesVisible.getMonth(), 1);
  const diasEnElMes = new Date(mesVisible.getFullYear(), mesVisible.getMonth() + 1, 0).getDate();
  const offsetInicio = (primerDiaDelMes.getDay() + 6) % 7;

  const celdas: (number | null)[] = [
    ...Array(offsetInicio).fill(null),
    ...Array.from({ length: diasEnElMes }, (_, i) => i + 1),
  ];

  const fechaDeCelda = (dia: number) => new Date(mesVisible.getFullYear(), mesVisible.getMonth(), dia);

  const mesAnterior = () => setMesVisible(new Date(mesVisible.getFullYear(), mesVisible.getMonth() - 1, 1));
  const mesSiguiente = () => setMesVisible(new Date(mesVisible.getFullYear(), mesVisible.getMonth() + 1, 1));

  return {
    abierto,
    setAbierto,
    mesVisible,
    setMesVisible,
    contenedorRef,
    celdas,
    fechaDeCelda,
    mesAnterior,
    mesSiguiente,
    hoyTexto: fechaHoyTexto(),
    minimaComparable: fechaMinima ?? "0000-01-01",
  };
}

export { fechaATexto };
