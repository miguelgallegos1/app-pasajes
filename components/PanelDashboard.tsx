// components/PanelDashboard.tsx
// Dashboard ejecutivo: KPIs de Pendientes/Aprobadas/Pagadas del mes
// actual (o del rango que elijas), más el top 5 de gasto por Área.

"use client";

import { useState, useEffect } from "react";
import CalendarioSelector from "./CalendarioSelector";
import Spinner from "./Spinner";

type KPI = { cantidad: number; total: number };
type Datos = {
  pendientes: KPI;
  aprobadas: KPI;
  pagadas: KPI;
  gastoPorArea: { area: string; total: number }[];
};

export default function PanelDashboard({
  desdeDefecto,
  hastaDefecto,
}: {
  desdeDefecto: string;
  hastaDefecto: string;
}) {
  const [desde, setDesde] = useState(desdeDefecto);
  const [hasta, setHasta] = useState(hastaDefecto);
  const [datos, setDatos] = useState<Datos | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  const buscar = async () => {
    if (!desde || !hasta) return;
    setCargando(true);
    setError("");
    const res = await fetch(`/api/dashboard/kpis?desde=${desde}&hasta=${hasta}`);
    setCargando(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "No se pudo cargar el dashboard");
      return;
    }
    setDatos(await res.json());
  };

  useEffect(() => {
    buscar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const maxGasto = datos ? Math.max(...datos.gastoPorArea.map((g) => g.total), 1) : 1;

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

      {datos && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Pendientes</p>
              <p className="text-2xl font-bold text-amber-900 mt-1">{datos.pendientes.cantidad}</p>
              <p className="text-sm text-amber-700 mt-0.5">${datos.pendientes.total.toFixed(2)}</p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-2xl p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-green-700">Aprobadas</p>
              <p className="text-2xl font-bold text-green-900 mt-1">{datos.aprobadas.cantidad}</p>
              <p className="text-sm text-green-700 mt-0.5">${datos.aprobadas.total.toFixed(2)}</p>
            </div>
            <div className="bg-orange-50 border border-orange-200 rounded-2xl p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-orange-700">Pagadas</p>
              <p className="text-2xl font-bold text-orange-900 mt-1">{datos.pagadas.cantidad}</p>
              <p className="text-sm text-orange-700 mt-0.5">${datos.pagadas.total.toFixed(2)}</p>
            </div>
          </div>

          <div className="bg-neutral-50 text-neutral-800 rounded-2xl p-5 shadow-sm ring-1 ring-black/5 space-y-3">
            <h2 className="font-semibold text-sm">Gasto por Área (Aprobado + Pagado)</h2>
            {datos.gastoPorArea.length === 0 && (
              <p className="text-sm text-neutral-400">Sin datos en este rango</p>
            )}
            {datos.gastoPorArea.map((g) => (
              <div key={g.area} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>{g.area}</span>
                  <span className="font-medium">${g.total.toFixed(2)}</span>
                </div>
                <div className="h-2 bg-neutral-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-orange-500 rounded-full"
                    style={{ width: `${(g.total / maxGasto) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}