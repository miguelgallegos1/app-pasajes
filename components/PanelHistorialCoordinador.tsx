// components/PanelHistorialCoordinador.tsx
// Historial de Revisadas + Pagadas dentro del alcance del Coordinador
// (solo consulta, sin acciones — para actuar se usa la pantalla de
// Revisión). Filtros por fecha, estado y colaborador, vista alterna
// agrupada por colaborador, y exportación a Excel.

"use client";

import { useState } from "react";
import CalendarioSelector from "./CalendarioSelector";
import SelectorModerno from "./SelectorModerno";
import ComboboxBuscable from "./ComboboxBuscable";
import Paginacion from "./Paginacion";
import { formatearFecha } from "../lib/fechas";
import TablaAgrupadaColaborador, { type FilaResumen } from "./TablaAgrupadaColaborador";
import { IconoDescargar } from "./Icons";

type Fila = {
  id: string;
  codigo: string;
  fecha: string;
  montoTotal: number;
  estado: string;
  rutaLabel: string;
  nombreColaborador: string;
};

const ESTILOS_ESTADO: Record<string, string> = {
  REVISADO: "bg-sky-100 text-sky-800",
  PAGADA: "bg-orange-100 text-orange-800",
};

export default function PanelHistorialCoordinador({
  colaboradores,
  sinAsignaciones,
}: {
  colaboradores: { id: string; nombreCompleto: string }[];
  sinAsignaciones: boolean;
}) {
  const [vista, setVista] = useState<"lista" | "colaborador">("lista");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [estado, setEstado] = useState("");
  const [colaboradorId, setColaboradorId] = useState("");
  const [items, setItems] = useState<Fila[] | null>(null);
  const [totalMonto, setTotalMonto] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  const [filasColaborador, setFilasColaborador] = useState<FilaResumen[] | null>(null);
  const [paginaColab, setPaginaColab] = useState(1);
  const [totalPaginasColab, setTotalPaginasColab] = useState(1);

  const opcionesColaborador = [
    { id: "", label: "Todos los colaboradores" },
    ...colaboradores.map((c) => ({ id: c.id, label: c.nombreCompleto })),
  ];

  const parametrosBase = () => {
    const params = new URLSearchParams({ desde, hasta });
    if (estado) params.set("estado", estado);
    if (colaboradorId) params.set("colaboradorId", colaboradorId);
    return params;
  };

  const buscar = async (paginaNueva = 1) => {
    if (!desde || !hasta) {
      setError("Selecciona ambas fechas");
      return;
    }
    setCargando(true);
    setError("");
    const params = parametrosBase();
    params.set("pagina", String(paginaNueva));

    try {
      if (vista === "lista") {
        const res = await fetch(`/api/coordinador/historial?${params.toString()}`);
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
      } else {
        const res = await fetch(`/api/coordinador/historial/colaboradores?${params.toString()}`);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data.error ?? "No se pudo cargar el historial");
          return;
        }
        const data = await res.json();
        setFilasColaborador(data.items);
        setTotalPaginasColab(data.totalPaginas);
        setPaginaColab(paginaNueva);
      }
    } catch {
      setError("No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setCargando(false);
    }
  };

  const cambiarVista = (v: "lista" | "colaborador") => {
    setVista(v);
    setItems(null);
    setFilasColaborador(null);
    setError("");
  };

  const cargarSubfilas = async (colaboradorId: string): Promise<FilaResumen[]> => {
    const params = new URLSearchParams({ desde, hasta });
    if (estado) params.set("estado", estado);
    const res = await fetch(`/api/coordinador/historial/colaboradores/${colaboradorId}/rutas?${params.toString()}`);
    if (!res.ok) return [];
    return res.json();
  };

  const cargarDetalle = async (colaboradorId: string, rutaId: string): Promise<Fila[]> => {
    const params = new URLSearchParams({ desde, hasta, colaboradorId, rutaId, pagina: "1" });
    if (estado) params.set("estado", estado);
    const res = await fetch(`/api/coordinador/historial?${params.toString()}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.items;
  };

  const urlExportar = () => `/api/coordinador/historial/exportar?${parametrosBase().toString()}`;
  const puedeExportar = !!desde && !!hasta;

  return (
    <div className="flex-1 px-4 sm:px-8 py-5 space-y-4">
      <h1 className="text-lg sm:text-xl font-bold">Historial</h1>
      <p className="text-xs text-orange-400 font-medium">Solicitudes Revisadas y Pagadas</p>

      {sinAsignaciones && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-xl px-4 py-3">
          No tienes ninguna Empresa/Sitio/Área asignada todavía.
        </div>
      )}

      <div className="bg-neutral-50 rounded-2xl p-5 shadow-sm ring-1 ring-black/5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Desde</label>
            <div className="mt-1.5"><CalendarioSelector value={desde} onChange={setDesde} /></div>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Hasta</label>
            <div className="mt-1.5"><CalendarioSelector value={hasta} onChange={setHasta} /></div>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Estado</label>
            <div className="mt-1.5">
              <SelectorModerno
                opciones={[
                  { value: "", label: "Todas" },
                  { value: "REVISADO", label: "Revisada" },
                  { value: "PAGADA", label: "Pagada" },
                ]}
                value={estado}
                onChange={setEstado}
                placeholder="Todas"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Colaborador</label>
            <div className="mt-1.5">
              <ComboboxBuscable opciones={opcionesColaborador} value={colaboradorId} onChange={setColaboradorId} placeholder="Todos" />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => buscar(1)}
            disabled={cargando || sinAsignaciones}
            className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-5 py-2.5 rounded-xl transition shadow-sm hover:shadow-md disabled:opacity-50"
          >
            {cargando ? "Buscando..." : "Buscar"}
          </button>

          <div className="flex bg-neutral-100 rounded-xl p-1 gap-1">
            {[
              { value: "lista" as const, label: "Lista" },
              { value: "colaborador" as const, label: "Por colaborador" },
            ].map((op) => (
              <button
                key={op.value}
                type="button"
                onClick={() => cambiarVista(op.value)}
                className={`text-xs font-semibold px-3 py-2 rounded-lg transition ${
                  vista === op.value ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500 hover:text-neutral-700"
                }`}
              >
                {op.label}
              </button>
            ))}
          </div>

          {puedeExportar ? (
            <a
              href={urlExportar()}
              className="ml-auto inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-700 border border-neutral-300 hover:border-orange-400 hover:text-orange-600 px-3.5 py-2.5 rounded-xl transition"
            >
              <IconoDescargar className="w-4 h-4" /> Exportar a Excel
            </a>
          ) : (
            <span className="ml-auto inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-300 border border-neutral-200 px-3.5 py-2.5 rounded-xl cursor-not-allowed">
              <IconoDescargar className="w-4 h-4" /> Exportar a Excel
            </span>
          )}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      {vista === "colaborador" && filasColaborador && (
        <div className="bg-white text-neutral-800 rounded-2xl overflow-hidden shadow-sm ring-1 ring-black/5">
          <TablaAgrupadaColaborador
            filas={filasColaborador}
            cargarSubfilas={cargarSubfilas}
            cargarDetalle={cargarDetalle}
            renderDetalle={(s: Fila) => (
              <div className="flex items-center justify-between gap-2 bg-neutral-50 rounded-lg px-3 py-2 text-sm">
                <div className="min-w-0">
                  <p className="font-mono font-bold tracking-widest text-neutral-500 text-xs">{s.codigo}</p>
                  <p className="text-neutral-600">{formatearFecha(s.fecha)}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-[11px] font-semibold px-2 py-1 rounded-full ${ESTILOS_ESTADO[s.estado] ?? "bg-neutral-100 text-neutral-600"}`}>
                    {s.estado}
                  </span>
                  <span className="font-semibold">${s.montoTotal.toFixed(2)}</span>
                </div>
              </div>
            )}
            vacio="No hay resultados en ese rango"
          />
          <Paginacion paginaActual={paginaColab} totalPaginas={totalPaginasColab} onCambiarPagina={buscar} deshabilitado={cargando} />
        </div>
      )}

      {vista === "lista" && items && (
        <div className="bg-white text-neutral-800 rounded-2xl overflow-hidden shadow-sm ring-1 ring-black/5">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-neutral-100 text-neutral-500 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Código</th>
                  <th className="px-4 py-3 font-medium">Fecha</th>
                  <th className="px-4 py-3 font-medium">Colaborador</th>
                  <th className="px-4 py-3 font-medium">Ruta</th>
                  <th className="px-4 py-3 font-medium">Valor</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody>
                {items.map((s) => (
                  <tr key={s.id} className="border-t border-neutral-100 hover:bg-neutral-50 transition">
                    <td className="px-4 py-3 font-mono font-bold tracking-widest text-neutral-500">{s.codigo}</td>
                    <td className="px-4 py-3">{formatearFecha(s.fecha)}</td>
                    <td className="px-4 py-3">{s.nombreColaborador}</td>
                    <td className="px-4 py-3 text-neutral-600">{s.rutaLabel}</td>
                    <td className="px-4 py-3">${s.montoTotal.toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${ESTILOS_ESTADO[s.estado] ?? "bg-neutral-100 text-neutral-600"}`}>
                        {s.estado}
                      </span>
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-neutral-400">
                      No hay resultados en ese rango
                    </td>
                  </tr>
                )}
              </tbody>
              {items.length > 0 && (
                <tfoot>
                  <tr className="border-t border-neutral-200 bg-neutral-50 font-semibold">
                    <td className="px-4 py-3" colSpan={4}>Total del rango</td>
                    <td className="px-4 py-3" colSpan={2}>${totalMonto.toFixed(2)}</td>
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
