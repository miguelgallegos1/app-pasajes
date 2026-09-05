// components/ModalHistorial.tsx
// Modal que filtra por rango de fechas las solicitudes ya PAGADAS.

"use client";

import { useState } from "react";
import CalendarioSelector from "./CalendarioSelector";

type SolicitudHistorial = {
  id: string;
  fecha: string;
  montoTotal: number;
  estado: string;
  ruta: { area: { nombre: string } };
};

export default function ModalHistorial({ onCerrar }: { onCerrar: () => void }) {
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [resultados, setResultados] = useState<SolicitudHistorial[] | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  const buscar = async () => {
    if (!desde || !hasta) {
      setError("Selecciona ambas fechas");
      return;
    }
    setCargando(true);
    setError("");
    const res = await fetch(`/api/solicitudes/historial?desde=${desde}&hasta=${hasta}`);
    setCargando(false);
    if (!res.ok) {
      setError("No se pudo cargar el historial");
      return;
    }
    setResultados(await res.json());
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white text-black rounded-t-3xl sm:rounded-3xl w-full sm:max-w-lg p-7 space-y-5 max-h-[90vh] overflow-y-auto shadow-2xl">
        <div>
          <h2 className="text-lg font-bold text-neutral-900">Historial de pagos</h2>
          <p className="text-xs text-neutral-500 mt-0.5">Solicitudes ya pagadas, filtradas por fecha</p>
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Desde</label>
            <div className="mt-1.5">
              <CalendarioSelector value={desde} onChange={setDesde} />
            </div>
          </div>
          <div className="flex-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Hasta</label>
            <div className="mt-1.5">
              <CalendarioSelector value={hasta} onChange={setHasta} />
            </div>
          </div>
        </div>

        <button
          onClick={buscar}
          disabled={cargando}
          className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-xl transition shadow-sm hover:shadow-md disabled:opacity-50"
        >
          {cargando ? "Buscando..." : "Buscar"}
        </button>

        {error && <p className="text-sm text-red-600">{error}</p>}

        {resultados && (
          <div className="border border-neutral-100 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 text-neutral-500 text-left">
                <tr>
                  <th className="px-3 py-2.5 font-medium">Fecha</th>
                  <th className="px-3 py-2.5 font-medium">Ruta</th>
                  <th className="px-3 py-2.5 font-medium">Valor</th>
                </tr>
              </thead>
              <tbody>
                {resultados.map((s) => (
                  <tr key={s.id} className="border-t border-neutral-100">
                    <td className="px-3 py-2.5">{new Date(s.fecha).toLocaleDateString()}</td>
                    <td className="px-3 py-2.5">{s.ruta.area.nombre}</td>
                    <td className="px-3 py-2.5 font-medium">${s.montoTotal.toFixed(2)}</td>
                  </tr>
                ))}
                {resultados.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-3 py-8 text-center text-neutral-400">
                      No hay pagos registrados en ese rango
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <button
          onClick={onCerrar}
          className="w-full text-center text-sm font-medium text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100 rounded-xl py-2.5 transition"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}