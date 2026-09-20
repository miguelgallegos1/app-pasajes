// components/PanelHistorialNomina.tsx
// Historial de PAGADAS (antes "Historial de Finanzas"): filtros en cascada
// Empresa -> Sitio -> Área -> Colaborador, rango de fechas obligatorio,
// vista alterna agrupada por colaborador, y exportación a Excel.

"use client";

import { useState, useMemo, useEffect } from "react";
import { formatearMoneda } from "../lib/formato";
import RangoFechasSelector from "./RangoFechasSelector";
import ComboboxBuscable from "./ComboboxBuscable";
import Paginacion from "./Paginacion";
import TablaEsqueleto from "./TablaEsqueleto";
import EstadoVacio from "./EstadoVacio";
import SelectorVista from "./SelectorVista";
import EncabezadoOrdenable from "./EncabezadoOrdenable";
import { formatearFecha, fechaHoyTexto } from "../lib/fechas";
import { useOrdenTabla } from "../lib/useOrdenTabla";
import TablaColaboradores, { type FilaColaborador } from "./TablaColaboradores";
import { IconoDescargar } from "./Icons";

type Empresa = { id: string; nombre: string };
type Sitio = { id: string; nombre: string; empresaId: string };
type Area = { id: string; nombre: string; sitioId: string };
type Fila = { id: string; codigo: string; fecha: string; fechaPago: string | null; montoTotal: number; nombreColaborador: string; rutaLabel: string };

type CampoOrden = "fecha" | "nombreColaborador" | "rutaLabel" | "montoTotal";
const VALOR_ORDEN: Record<CampoOrden, (f: Fila) => string | number> = {
  fecha: (f) => f.fecha,
  nombreColaborador: (f) => f.nombreColaborador,
  rutaLabel: (f) => f.rutaLabel,
  montoTotal: (f) => f.montoTotal,
};

export default function PanelHistorialNomina() {
  const [vista, setVista] = useState<"lista" | "colaborador">("lista");
  const [desde, setDesde] = useState(fechaHoyTexto);
  const [hasta, setHasta] = useState(fechaHoyTexto);
  const [empresaId, setEmpresaId] = useState("");
  const [sitioId, setSitioId] = useState("");
  const [areaId, setAreaId] = useState("");
  const [colaboradorId, setColaboradorId] = useState("");

  // Empresa/Sitio/Área para los combos de filtro: se piden al montar en
  // vez de esperar a que el servidor las traiga antes de mostrar la
  // pantalla — los controles aparecen de una, y los combos se llenan un
  // instante después.
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [sitios, setSitios] = useState<Sitio[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  useEffect(() => {
    fetch("/api/nomina/historial/filtros")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return;
        setEmpresas(data.empresas);
        setSitios(data.sitios);
        setAreas(data.areas);
      })
      .catch(() => {});
  }, []);

  // Opciones del combo "Colaborador": solo quienes tienen actividad en el
  // rango y los filtros Empresa/Sitio/Área elegidos, no la lista completa
  // de la empresa (que puede ser grande y no tiene relación con la
  // búsqueda).
  const [colaboradores, setColaboradores] = useState<{ id: string; nombreCompleto: string }[]>([]);
  useEffect(() => {
    if (!desde || !hasta) return;
    const params = new URLSearchParams({ desde, hasta });
    if (empresaId) params.set("empresaId", empresaId);
    if (sitioId) params.set("sitioId", sitioId);
    if (areaId) params.set("areaId", areaId);
    let cancelado = false;
    fetch(`/api/nomina/historial/colaboradores-filtro?${params.toString()}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (cancelado) return;
        setColaboradores(data);
        setColaboradorId((actual) => (actual && !data.some((c: { id: string }) => c.id === actual) ? "" : actual));
      })
      .catch(() => {});
    return () => {
      cancelado = true;
    };
  }, [desde, hasta, empresaId, sitioId, areaId]);

  const [items, setItems] = useState<Fila[] | null>(null);
  const [totalMonto, setTotalMonto] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  const [filasColaborador, setFilasColaborador] = useState<FilaColaborador[] | null>(null);
  const [paginaColab, setPaginaColab] = useState(1);
  const [totalPaginasColab, setTotalPaginasColab] = useState(1);

  const { orden, ordenar, itemsOrdenados } = useOrdenTabla<Fila, CampoOrden>(
    items ?? [],
    (f, campo) => VALOR_ORDEN[campo](f),
    "historial-nomina"
  );

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
  const colaboradoresOpciones = useMemo(
    () => colaboradores.map((c) => ({ id: c.id, label: c.nombreCompleto })),
    [colaboradores]
  );

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

  // Detalle (código/fecha/ruta/valor) de UN colaborador, pedido solo
  // cuando lo expande — no viaja con la lista completa.
  const cargarItemsColaborador = async (idColaborador: string): Promise<Fila[]> => {
    const params = new URLSearchParams({ desde, hasta, colaboradorId: idColaborador, pagina: "1" });
    const res = await fetch(`/api/nomina/historial?${params.toString()}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.items;
  };

  const urlExportar = () => `/api/nomina/historial/exportar?${parametrosBase().toString()}`;
  // Exportar usa los mismos filtros que "Buscar", así que solo habilitamos
  // el botón cuando esa búsqueda ya trajo resultados — evita generar un
  // Excel vacío cuando el rango/filtro elegido no tiene datos.
  const hayDatos = vista === "lista" ? (items?.length ?? 0) > 0 : (filasColaborador?.length ?? 0) > 0;
  const puedeExportar = !!desde && !!hasta && hayDatos;

  return (
    <div className="flex-1 px-4 sm:px-8 pb-5 space-y-4">

      <div className="bg-neutral-50 dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 rounded-2xl p-5 shadow-sm ring-1 ring-black/5 dark:ring-white/10 space-y-4">
        <div className="max-w-xs">
          <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Rango de fechas</label>
          <div className="mt-1.5">
            <RangoFechasSelector desde={desde} hasta={hasta} onChange={(d, h) => { setDesde(d); setHasta(h); }} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Empresa</label>
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
            <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Sitio</label>
            <div className="mt-1.5">
              <ComboboxBuscable opciones={sitiosOpciones} value={sitioId} onChange={cambiarSitio} placeholder="Todos" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Área</label>
            <div className="mt-1.5">
              <ComboboxBuscable opciones={areasOpciones} value={areaId} onChange={cambiarArea} placeholder="Todas" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Colaborador</label>
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

          <SelectorVista valor={vista} onCambiar={cambiarVista} />

          {puedeExportar ? (
            <a
              href={urlExportar()}
              className="w-full sm:w-auto sm:ml-auto inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-neutral-700 dark:text-neutral-300 border border-neutral-300 hover:border-orange-400 hover:text-orange-600 px-3.5 py-2.5 rounded-xl transition"
            >
              <IconoDescargar className="w-4 h-4" /> Exportar a Excel
            </a>
          ) : (
            <span
              title={!desde || !hasta ? "Selecciona ambas fechas" : "Busca primero: no hay resultados para exportar"}
              className="w-full sm:w-auto sm:ml-auto inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-neutral-300 dark:text-neutral-700 border border-neutral-200 dark:border-neutral-800 px-3.5 py-2.5 rounded-xl cursor-not-allowed"
            >
              <IconoDescargar className="w-4 h-4" /> Exportar a Excel
            </span>
          )}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      {cargando && <TablaEsqueleto columnas={vista === "lista" ? 5 : 3} />}

      {!cargando && vista === "colaborador" && filasColaborador && (
        <div className="bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 rounded-2xl overflow-hidden shadow-sm ring-1 ring-black/5 dark:ring-white/10">
          <TablaColaboradores
            filas={filasColaborador}
            cargarItems={cargarItemsColaborador}
            clave={(s) => s.id}
            claveOrden="nomina-historial-colaborador"
            columnas={[
              { encabezado: "Código", render: (s) => <span className="font-mono">{s.codigo}</span> },
              {
                encabezado: "Fecha",
                render: (s) => (
                  <>
                    <p>{formatearFecha(s.fecha)}</p>
                    {s.fechaPago && (
                      <p className="text-[11px] text-neutral-400 dark:text-neutral-500">Pagada {formatearFecha(s.fechaPago)}</p>
                    )}
                  </>
                ),
              },
              { encabezado: "Ruta", render: (s) => s.rutaLabel },
              { encabezado: "Valor", render: (s) => formatearMoneda(s.montoTotal) },
            ]}
            vacio="No hay pagos registrados en ese rango"
          />
          <Paginacion paginaActual={paginaColab} totalPaginas={totalPaginasColab} onCambiarPagina={buscar} deshabilitado={cargando} />
        </div>
      )}

      {!cargando && vista === "lista" && items && (
        <div className="bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 rounded-2xl overflow-hidden shadow-sm ring-1 ring-black/5 dark:ring-white/10">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-xs">
              <thead className="bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Código</th>
                  <EncabezadoOrdenable campo="fecha" ordenActivo={orden} onOrdenar={ordenar}>Fecha del pasaje</EncabezadoOrdenable>
                  <EncabezadoOrdenable campo="nombreColaborador" ordenActivo={orden} onOrdenar={ordenar}>Colaborador</EncabezadoOrdenable>
                  <EncabezadoOrdenable campo="rutaLabel" ordenActivo={orden} onOrdenar={ordenar}>Ruta</EncabezadoOrdenable>
                  <EncabezadoOrdenable campo="montoTotal" ordenActivo={orden} onOrdenar={ordenar}>Valor</EncabezadoOrdenable>
                </tr>
              </thead>
              <tbody>
                {itemsOrdenados.map((s) => (
                  <tr key={s.id} className="border-t border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/60 transition">
                    <td className="px-4 py-3 font-mono font-bold tracking-widest text-neutral-500 dark:text-neutral-400">{s.codigo}</td>
                    <td className="px-4 py-3">
                      <p>{formatearFecha(s.fecha)}</p>
                      {s.fechaPago && (
                        <p className="text-[11px] text-neutral-400 dark:text-neutral-500">
                          Pagada: {new Date(s.fechaPago).toLocaleDateString()}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">{s.nombreColaborador}</td>
                    <td className="px-4 py-3 text-neutral-600">{s.rutaLabel}</td>
                    <td className="px-4 py-3">{formatearMoneda(s.montoTotal)}</td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-10">
                      <EstadoVacio mensaje="No hay pagos registrados en ese rango" />
                    </td>
                  </tr>
                )}
              </tbody>
              {items.length > 0 && (
                <tfoot>
                  <tr className="border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/60 font-semibold">
                    <td className="px-4 py-3" colSpan={4}>Total del rango</td>
                    <td className="px-4 py-3">{formatearMoneda(totalMonto)}</td>
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
