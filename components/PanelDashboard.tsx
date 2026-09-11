// components/PanelDashboard.tsx
// Dashboard ejecutivo: KPIs del período elegido, tendencia mensual (barras
// apiladas por estado, últimos 6 meses) y gasto por Área (dona), con
// colores e interacción siguiendo el skill de dataviz del proyecto.

"use client";

import { useState } from "react";
import CalendarioSelector from "./CalendarioSelector";
import Spinner from "./Spinner";
import GraficoBarrasMensual, { type FilaMes } from "./GraficoBarrasMensual";
import GraficoPastelAreas from "./GraficoPastelAreas";

type KPI = { cantidad: number; total: number };
type Datos = {
  pendientes: KPI;
  aprobadas: KPI;
  revisadas: KPI;
  pagadas: KPI;
  gastoPorArea: { area: string; total: number }[];
  tendenciaMensual: FilaMes[];
};

// Mismo mapeo de color que en GraficoBarrasMensual — un estado siempre
// se ve del mismo color en toda la pantalla (tarjeta, leyenda y barra).
const TARJETAS_KPI = [
  { clave: "pendientes" as const, label: "Pendientes", color: "#eda100", fondo: "bg-amber-50", texto: "text-amber-800" },
  { clave: "aprobadas" as const, label: "Aprobadas", color: "#1baf7a", fondo: "bg-emerald-50", texto: "text-emerald-800" },
  { clave: "revisadas" as const, label: "Revisadas", color: "#2a78d6", fondo: "bg-blue-50", texto: "text-blue-800" },
  { clave: "pagadas" as const, label: "Pagadas", color: "#eb6834", fondo: "bg-orange-50", texto: "text-orange-800" },
];

export default function PanelDashboard() {
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [datos, setDatos] = useState<Datos | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  const buscar = async () => {
    if (!desde || !hasta) {
      setError("Selecciona ambas fechas");
      return;
    }
    setCargando(true);
    setError("");
    try {
      const res = await fetch(`/api/dashboard/kpis?desde=${desde}&hasta=${hasta}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "No se pudo cargar el dashboard");
        return;
      }
      setDatos(await res.json());
    } catch {
      setError("No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="flex-1 px-4 sm:px-8 py-5 space-y-4">
      <h1 className="text-lg sm:text-xl font-bold">Dashboard</h1>
      <p className="text-xs text-orange-400 font-medium">Resumen del período seleccionado</p>

      <div className="bg-neutral-50 text-neutral-800 rounded-2xl p-5 shadow-sm ring-1 ring-black/5 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Desde</label>
            <div className="mt-1.5"><CalendarioSelector value={desde} onChange={setDesde} /></div>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Hasta</label>
            <div className="mt-1.5"><CalendarioSelector value={hasta} onChange={setHasta} /></div>
          </div>
        </div>
        <button
          onClick={buscar}
          disabled={cargando}
          className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-5 py-2.5 rounded-xl transition shadow-sm hover:shadow-md disabled:opacity-50 flex items-center gap-2"
        >
          {cargando && <Spinner className="w-4 h-4" />}
          {cargando ? "Cargando..." : "Actualizar"}
        </button>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      {!datos && !error && (
        <p className="text-sm text-neutral-400">Elige un rango de fechas y presiona Actualizar para ver los datos.</p>
      )}

      {datos && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {TARJETAS_KPI.map((t) => {
              const kpi = datos[t.clave];
              return (
                <div key={t.clave} className={`${t.fondo} border border-black/5 rounded-2xl p-4 sm:p-5`}>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
                    <p className={`text-xs font-semibold uppercase tracking-wide ${t.texto}`}>{t.label}</p>
                  </div>
                  <p className="text-2xl sm:text-3xl font-bold text-neutral-900 mt-1.5">{kpi.cantidad}</p>
                  <p className={`text-sm ${t.texto} mt-0.5`}>${kpi.total.toFixed(2)}</p>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-neutral-50 rounded-2xl p-5 shadow-sm ring-1 ring-black/5">
              <h2 className="font-semibold text-sm text-neutral-800">Solicitudes por mes</h2>
              <p className="text-xs text-neutral-400 mb-3">Últimos 6 meses, por estado</p>
              <GraficoBarrasMensual datos={datos.tendenciaMensual} />
            </div>

            <div className="bg-neutral-50 rounded-2xl p-5 shadow-sm ring-1 ring-black/5">
              <h2 className="font-semibold text-sm text-neutral-800">Gasto por Área</h2>
              <p className="text-xs text-neutral-400 mb-3">Aprobado + Revisado + Pagado, período seleccionado</p>
              <GraficoPastelAreas datos={datos.gastoPorArea} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
