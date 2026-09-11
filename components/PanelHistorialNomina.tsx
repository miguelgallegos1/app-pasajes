// components/PanelHistorialNomina.tsx
// Historial de PAGADAS (antes "Historial de Finanzas"): filtros en cascada
// Empresa -> Sitio -> Área -> Colaborador, rango de fechas obligatorio,
// vista alterna agrupada por colaborador, y exportación a Excel.

"use client";

import { useState, useMemo } from "react";
import CalendarioSelector from "./CalendarioSelector";
import ComboboxBuscable from "./ComboboxBuscable";
import Paginacion from "./Paginacion";
import { formatearFecha } from "../lib/fechas";
import TablaAgrupadaColaborador, { type FilaResumen } from "./TablaAgrupadaColaborador";
import { IconoDescargar } from "./Icons";

type Empresa = { id: string; nombre: string };
type Sitio = { id: string; nombre: string; empresaId: string };
type Area = { id: string; nombre: string; sitioId: string };
type Colaborador = { id: string; nombreCompleto: string; areaId: string };
type Fila = { id: string; codigo: string; fecha: string; fechaPago: string | null; montoTotal: number; nombreColaborador: string; rutaLabel: string };

export default function PanelHistorialNomina({
  empresas,
  sitios,
  areas,
  colaboradores,
}: {
  empresas: Empresa[];
  sitios: Sitio[];
  areas: Area[];
  colaboradores: Colaborador[];
}) {
  const [vista, setVista] = useState<"lista" | "colaborador">("lista");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [empresaId, setEmpresaId] = useState("");
  const [sitioId, setSitioId] = useState("");
  const [areaId, setAreaId] = useState("");
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

  const sitiosOpciones = useMemo(
    () => (empresaId ? sitios.filter((s) => s.empresaId === empresaId) : sitios).map((s) => ({ id: s.id, label: s.nombre })),
    [sitios, empresaId]
  );
  const sitiosPermitidos = useMemo(
    () => new Set((empresaId ? sitios.filter((s) => s.empresaId === empresaId) : sitios).map((s) => s.id)),
    [sitios, empresaId]
  );
  const areasOpciones = useMemo(() => {
    const base = sitioId ? areas.filter((a) => a.sitioId === sitioId) : areas.filter((a) => sitiosPermitidos.has(a.sitioId));
    return base.map((a) => ({ id: a.id, label: a.nombre }));
  }, [areas, sitioId, sitiosPermitidos]);
  const areasPermitidas = useMemo(() => {
    const base = sitioId ? areas.filter((a) => a.sitioId === sitioId) : areas.filter((a) => sitiosPermitidos.has(a.sitioId));
    return new Set(base.map((a) => a.id));
  }, [areas, sitioId, sitiosPermitidos]);
  const colaboradoresOpciones = useMemo(() => {
    const base = areaId ? colaboradores.filter((c) => c.areaId === areaId) : colaboradores.filter((c) => areasPermitidas.has(c.areaId));
    return base.map((c) => ({ id: c.id, label: c.nombreCompleto }));
  }, [colaboradores, areaId, areasPermitidas]);

  const cambiarEmpresa = (v: string) => { setEmpresaId(v); setSitioId(""); setAreaId(""); setColaboradorId(""); };
  const cambiarSitio = (v: string) => { setSitioId(v); setAreaId(""); setColaboradorId(""); };
  const cambiarArea = (v: string) => { setAreaId(v); setColaboradorId(""); };

  const parametrosBase = () => {
    const params = new URLSearchParams({ desde, hasta });
    if (empresaId) params.set("empresaId", empresaId);
    if (sitioId) params.set("sitioId", sitioId);
    if (areaId) params.set("areaId", areaId);
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
        const res = await fetch(`/api/nomina/historial?${params.toString()}`);
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
        const res = await fetch(`/api/nomina/historial/colaboradores?${params.toString()}`);
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
    const res = await fetch(`/api/nomina/historial/colaboradores/${colaboradorId}/rutas?${params.toString()}`);
    if (!res.ok) return [];
    return res.json();
  };

  const cargarDetalle = async (colaboradorId: string, rutaId: string): Promise<Fila[]> => {
    const params = new URLSearchParams({ desde, hasta, colaboradorId, rutaId, pagina: "1" });
    const res = await fetch(`/api/nomina/historial?${params.toString()}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.items;
  };

  const urlExportar = () => `/api/nomina/historial/exportar?${parametrosBase().toString()}`;
  const puedeExportar = !!desde && !!hasta;

  return (
    <div className="flex-1 px-4 sm:px-8 py-5 space-y-4">
      <h1 className="text-lg sm:text-xl font-bold">Historial de Pagos</h1>
      <p className="text-xs text-orange-400 font-medium">Solicitudes ya Pagadas</p>

      <div className="bg-neutral-50 text-neutral-800 rounded-2xl p-5 shadow-sm ring-1 ring-black/5 space-y-4">
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Empresa</label>
            <div className="mt-1.5">
              <ComboboxBuscable
                opciones={empresas.map((e) => ({ id: e.id, label: e.nombre }))}
                value={empresaId}
                onChange={cambiarEmpresa}
                placeholder="Todas"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Sitio</label>
            <div className="mt-1.5">
              <ComboboxBuscable opciones={sitiosOpciones} value={sitioId} onChange={cambiarSitio} placeholder="Todos" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Área</label>
            <div className="mt-1.5">
              <ComboboxBuscable opciones={areasOpciones} value={areaId} onChange={cambiarArea} placeholder="Todas" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Colaborador</label>
            <div className="mt-1.5">
              <ComboboxBuscable opciones={colaboradoresOpciones} value={colaboradorId} onChange={setColaboradorId} placeholder="Todos" />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => buscar(1)}
            disabled={cargando}
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
                  <p className="text-neutral-600">{formatearFecha(s.fecha)}{s.fechaPago ? ` · Pagada ${formatearFecha(s.fechaPago)}` : ""}</p>
                </div>
                <span className="font-semibold shrink-0">${s.montoTotal.toFixed(2)}</span>
              </div>
            )}
            vacio="No hay pagos registrados en ese rango"
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
                  <th className="px-4 py-3 font-medium">Fecha del pasaje</th>
                  <th className="px-4 py-3 font-medium">Colaborador</th>
                  <th className="px-4 py-3 font-medium">Ruta</th>
                  <th className="px-4 py-3 font-medium">Valor</th>
                </tr>
              </thead>
              <tbody>
                {items.map((s) => (
                  <tr key={s.id} className="border-t border-neutral-100 hover:bg-neutral-50 transition">
                    <td className="px-4 py-3 font-mono font-bold tracking-widest text-neutral-500">{s.codigo}</td>
                    <td className="px-4 py-3">
                      <p>{formatearFecha(s.fecha)}</p>
                      {s.fechaPago && (
                        <p className="text-[11px] text-neutral-400">
                          Pagada: {new Date(s.fechaPago).toLocaleDateString()}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">{s.nombreColaborador}</td>
                    <td className="px-4 py-3 text-neutral-600">{s.rutaLabel}</td>
                    <td className="px-4 py-3">${s.montoTotal.toFixed(2)}</td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-neutral-400">
                      No hay pagos registrados en ese rango
                    </td>
                  </tr>
                )}
              </tbody>
              {items.length > 0 && (
                <tfoot>
                  <tr className="border-t border-neutral-200 bg-neutral-50 font-semibold">
                    <td className="px-4 py-3" colSpan={4}>Total del rango</td>
                    <td className="px-4 py-3">${totalMonto.toFixed(2)}</td>
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
