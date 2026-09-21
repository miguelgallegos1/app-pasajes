// components/useFechaMinimaSolicitud.ts
// Fecha mínima seleccionable en el calendario de nueva solicitud (propia,
// la que crea TH en nombre de un colaborador, y "copiar rutas"), según el
// parámetro "días atrás" configurado en Admin -> Parámetros. Arranca con
// el valor por defecto para no bloquear el primer render, y se ajusta
// apenas llega la respuesta real.

import { useEffect, useMemo, useState } from "react";
import { DIAS_ATRAS_SOLICITUD_DEFECTO } from "../lib/config";

export function useFechaMinimaSolicitud(): string {
  const [diasAtras, setDiasAtras] = useState(DIAS_ATRAS_SOLICITUD_DEFECTO);

  useEffect(() => {
    let cancelado = false;
    fetch("/api/parametros")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelado && typeof data?.diasAtrasSolicitud === "number") setDiasAtras(data.diasAtrasSolicitud);
      })
      .catch(() => {});
    return () => {
      cancelado = true;
    };
  }, []);

  return useMemo(() => {
    const limite = new Date();
    limite.setDate(limite.getDate() - diasAtras);
    const y = limite.getFullYear();
    const m = String(limite.getMonth() + 1).padStart(2, "0");
    const d = String(limite.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, [diasAtras]);
}
