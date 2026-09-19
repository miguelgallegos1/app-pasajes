// components/PanelHistorialColaborador.tsx
// Historial de solicitudes Aprobadas y/o Pagadas para un colaborador o
// supervisor: filtro de fechas, estado y (si es supervisor) a quién del
// equipo mirar. Reemplaza el modal que vivía dentro de "Mis Pasajes" para
// que "Historial" sea una página propia del menú, igual que en los demás roles.

"use client";

import { useState } from "react";
import { formatearMoneda } from "../lib/formato";
import { DESCRIPCION_ESTADO } from "../lib/estadosSolicitud";
import RangoFechasSelector from "./RangoFechasSelector";
import SelectorModerno from "./SelectorModerno";
import ComboboxBuscable from "./ComboboxBuscable";
import Paginacion from "./Paginacion";
import TablaEsqueleto from "./TablaEsqueleto";
import EstadoVacio from "./EstadoVacio";
import EncabezadoOrdenable from "./EncabezadoOrdenable";
import { formatearFecha, fechaHoyTexto } from "../lib/fechas";
import { useOrdenTabla } from "../lib/useOrdenTabla";

type Fila = {
  id: string;
  codigo: string;
  fecha: string;
  montoTotal: number;
  estado: string;
  rutaLabel: string;
  nombreColaborador: string;
};

type CampoOrden = "fecha" | "nombreColaborador" | "rutaLabel" | "montoTotal" | "estado";
const VALOR_ORDEN: Record<CampoOrden, (f: Fila) => string | number> = {
  fecha: (f) => f.fecha,
  nombreColaborador: (f) => f.nombreColaborador,
  rutaLabel: (f) => f.rutaLabel,
  montoTotal: (f) => f.montoTotal,
  estado: (f) => f.estado,
};

const ESTILOS_ESTADO: Record<string, string> = {
  APROBADA: "bg-green-100 text-green-800",
  PAGADA: "bg-orange-100 text-orange-800",
};

export default function PanelHistorialColaborador({
  esSupervisor,
  equipo,
}: {
  esSupervisor: boolean;
  equipo: { id: string; nombreCompleto: string }[];
}) {
  const [desde, setDesde] = useState(fechaHoyTexto);
  const [hasta, setHasta] = useState(fechaHoyTexto);
  const [estado, setEstado] = useState("");
  const [colaboradorId, setColaboradorId] = useState("");
  const [items, setItems] = useState<Fila[] | null>(null);
  const [totalMonto, setTotalMonto] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  const { orden, ordenar, itemsOrdenados } = useOrdenTabla<Fila, CampoOrden>(
    items ?? [],
    (f, campo) => VALOR_ORDEN[campo](f),
    "historial-colaborador"
  );

  const opcionesColaborador = [
    { id: "", label: "Todo mi equipo" },
    ...equipo.map((c) => ({ id: c.id, label: c.nombreCompleto })),
  ];

  const buscar = async (paginaNueva = 1) => {
    if (!desde || !hasta) {
      setError("Selecciona ambas fechas");
      return;
    }
    setCargando(true);
    setError("");
    const params = new URLSearchParams({ desde, hasta, pagina: String(paginaNueva) });
    if (estado) params.set("estado", estado);
    if (colaboradorId) params.set("colaboradorId", colaboradorId);

    try {
      const res = await fetch(`/api/solicitudes/historial?${params.toString()}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "No se pudo cargar el historial");
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
    <div className="flex-1 px-4 sm:px-8 py-5 space-y-4">
      <div className="flex flex-wrap items-baseline gap-2">
        <h1 className="text-lg sm:text-xl font-bold">Historial</h1>
        <span className="hidden sm:inline text-xs text-neutral-500 dark:text-neutral-400">
          · Solicitudes aprobadas y pagadas, filtradas por fecha
        </span>
      </div>

      <div className="bg-neutral-50 dark:bg-neutral-900 rounded-2xl p-5 shadow-sm ring-1 ring-black/5 dark:ring-white/10 space-y-4">
        <div className={`grid grid-cols-1 sm:grid-cols-2 ${esSupervisor ? "lg:grid-cols-3" : "lg:grid-cols-2"} gap-3`}>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Rango de fechas</label>
            <div className="mt-1.5">
              <RangoFechasSelector desde={desde} hasta={hasta} onChange={(d, h) => { setDesde(d); setHasta(h); }} />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Estado</label>
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
          {esSupervisor && (
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Colaborador</label>
              <div className="mt-1.5">
                <ComboboxBuscable
                  opciones={opcionesColaborador}
                  value={colaboradorId}
                  onChange={setColaboradorId}
                  placeholder="Todo mi equipo"
                />
              </div>
            </div>
          )}
        </div>

        <button
          onClick={() => buscar(1)}
          disabled={cargando}
          className="w-full sm:w-auto bg-orange-500 hover:bg-orange-600 text-white font-semibold px-5 py-2.5 rounded-xl transition shadow-sm hover:shadow-md disabled:opacity-50"
        >
          {cargando ? "Buscando..." : "Buscar"}
        </button>

        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      {cargando ? (
        <TablaEsqueleto columnas={esSupervisor ? 6 : 5} />
      ) : items && (
        <div className="bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 rounded-2xl overflow-hidden shadow-sm ring-1 ring-black/5 dark:ring-white/10">
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[680px]">
              <thead className="bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Código</th>
                  <EncabezadoOrdenable campo="fecha" ordenActivo={orden} onOrdenar={ordenar}>Fecha</EncabezadoOrdenable>
                  {esSupervisor && (
                    <EncabezadoOrdenable campo="nombreColaborador" ordenActivo={orden} onOrdenar={ordenar}>Colaborador</EncabezadoOrdenable>
                  )}
                  <EncabezadoOrdenable campo="rutaLabel" ordenActivo={orden} onOrdenar={ordenar}>Ruta</EncabezadoOrdenable>
                  <EncabezadoOrdenable campo="montoTotal" ordenActivo={orden} onOrdenar={ordenar}>Valor</EncabezadoOrdenable>
                  <EncabezadoOrdenable campo="estado" ordenActivo={orden} onOrdenar={ordenar}>Estado</EncabezadoOrdenable>
                </tr>
              </thead>
              <tbody>
                {itemsOrdenados.map((s) => (
                  <tr key={s.id} className="border-t border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/60 transition">
                    <td className="px-4 py-3 font-mono font-bold tracking-widest text-neutral-500 dark:text-neutral-400">{s.codigo}</td>
                    <td className="px-4 py-3">{formatearFecha(s.fecha)}</td>
                    {esSupervisor && <td className="px-4 py-3">{s.nombreColaborador}</td>}
                    <td className="px-4 py-3 text-neutral-600">{s.rutaLabel}</td>
                    <td className="px-4 py-3">{formatearMoneda(s.montoTotal)}</td>
                    <td className="px-4 py-3">
                      <span title={DESCRIPCION_ESTADO[s.estado]} className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${ESTILOS_ESTADO[s.estado]}`}>
                        {s.estado}
                      </span>
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={esSupervisor ? 6 : 5} className="px-4 py-10">
                      <EstadoVacio mensaje="No hay resultados en ese rango" />
                    </td>
                  </tr>
                )}
              </tbody>
              {items.length > 0 && (
                <tfoot>
                  <tr className="border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/60 font-semibold">
                    <td className="px-4 py-3" colSpan={esSupervisor ? 4 : 3}>Total del rango</td>
                    <td className="px-4 py-3" colSpan={2}>{formatearMoneda(totalMonto)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
          <Paginacion paginaActual={pagina} totalPaginas={totalPaginas} onCambiarPagina={buscar} deshabilitado={cargando} />
        </div>
      )}
    </div>
  );
}
