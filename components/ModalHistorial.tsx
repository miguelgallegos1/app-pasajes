// components/ModalHistorial.tsx
// Historial de solicitudes Aprobadas y/o Pagadas: filtro de fechas,
// filtro de estado (con SelectorModerno), total y paginación.

"use client";

import { useState } from "react";
import CalendarioSelector from "./CalendarioSelector";
import SelectorModerno from "./SelectorModerno";
import Paginacion from "./Paginacion";
import Modal from "./Modal";
import { formatearFecha } from "../lib/fechas";

type Fila = { id: string; codigo: string; fecha: string; montoTotal: number; estado: string; rutaLabel: string };

const ESTILOS_ESTADO: Record<string, string> = {
  APROBADA: "bg-green-100 text-green-800",
  PAGADA: "bg-orange-100 text-orange-800",
};

export default function ModalHistorial({ abierto, onCerrar }: { abierto: boolean; onCerrar: () => void }) {
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [estado, setEstado] = useState("");
  const [items, setItems] = useState<Fila[] | null>(null);
  const [totalMonto, setTotalMonto] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  const buscar = async (paginaNueva = 1) => {
    if (!desde || !hasta) {
      setError("Selecciona ambas fechas");
      return;
    }
    setCargando(true);
    setError("");
    const params = new URLSearchParams({ desde, hasta, pagina: String(paginaNueva) });
    if (estado) params.set("estado", estado);

    try {
      const res = await fetch(`/api/solicitudes/historial?${params.toString()}`);
      if (!res.ok) {
        setError("No se pudo cargar el historial");
        return;
      }
      const data = await res.json();
      setItems(data.items);
      setTotalMonto(data.totalMonto);
      setTotalPaginas(data.totalPaginas);
      setPagina(paginaNueva);
    } catch {
      setError("No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setCargando(false);
    }
  };

  return (
    <Modal
      abierto={abierto}
      className="bg-white text-neutral-800 rounded-t-3xl sm:rounded-3xl w-full sm:max-w-2xl p-7 space-y-5 max-h-[90vh] overflow-y-auto shadow-2xl"
    >
        <div>
          <h2 className="text-lg font-bold text-neutral-900">Historial</h2>
          <p className="text-xs text-neutral-500 mt-0.5">Solicitudes aprobadas y pagadas, filtradas por fecha</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Desde</label>
            <div className="mt-1.5">
              <CalendarioSelector value={desde} onChange={setDesde} />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Hasta</label>
            <div className="mt-1.5">
              <CalendarioSelector value={hasta} onChange={setHasta} />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Estado</label>
            <div className="mt-1.5">
              <SelectorModerno
                opciones={[
                  { value: "", label: "Todas" },
                  { value: "APROBADA", label: "Aprobada" },
                  { value: "PAGADA", label: "Pagada" },
                ]}
                value={estado}
                onChange={setEstado}
                placeholder="Todas"
              />
            </div>
          </div>
        </div>

        <button
          onClick={() => buscar(1)}
          disabled={cargando}
          className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-xl transition shadow-sm hover:shadow-md disabled:opacity-50"
        >
          {cargando ? "Buscando..." : "Buscar"}
        </button>

        {error && <p className="text-sm text-red-600">{error}</p>}

        {items && (
          <div className="border border-neutral-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-neutral-100 text-neutral-500 text-left">
                  <tr>
                    <th className="px-3 py-2.5 font-medium">Código</th>
                    <th className="px-3 py-2.5 font-medium">Fecha</th>
                    <th className="px-3 py-2.5 font-medium">Ruta</th>
                    <th className="px-3 py-2.5 font-medium">Valor</th>
                    <th className="px-3 py-2.5 font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((s) => (
                    <tr key={s.id} className="border-t border-neutral-100 hover:bg-neutral-50 transition">
                      <td className="px-3 py-2.5 font-mono font-bold tracking-widest text-neutral-500">{s.codigo}</td>
                      <td className="px-3 py-2.5">{formatearFecha(s.fecha)}</td>
                      <td className="px-3 py-2.5">{s.rutaLabel}</td>
                      <td className="px-3 py-2.5">${s.montoTotal.toFixed(2)}</td>
                      <td className="px-3 py-2.5">
                        <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${ESTILOS_ESTADO[s.estado]}`}>
                          {s.estado}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {items.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-3 py-8 text-center text-neutral-400">
                        No hay resultados en ese rango
                      </td>
                    </tr>
                  )}
                </tbody>
                {items.length > 0 && (
                  <tfoot>
                    <tr className="border-t border-neutral-200 bg-neutral-50 font-semibold">
                      <td className="px-3 py-2.5" colSpan={3}>Total del rango</td>
                      <td className="px-3 py-2.5" colSpan={2}>${totalMonto.toFixed(2)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            <Paginacion paginaActual={pagina} totalPaginas={totalPaginas} onCambiarPagina={buscar} deshabilitado={cargando} />
          </div>
        )}

        <button
          onClick={onCerrar}
          className="w-full text-center text-sm font-medium text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100 rounded-xl py-2.5 transition"
        >
          Cerrar
        </button>
    </Modal>
  );
}