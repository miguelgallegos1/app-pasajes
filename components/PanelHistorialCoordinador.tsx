// components/PanelHistorialCoordinador.tsx
// Historial de Revisadas + Pagadas dentro del alcance del Coordinador
// (solo consulta, sin acciones — para actuar se usa la pantalla de
// Revisión). Filtros por fecha, estado y colaborador, vista alterna
// agrupada por colaborador, y exportación a Excel.

"use client";

import { useState, useEffect } from "react";
import { formatearMoneda } from "../lib/formato";
import { DESCRIPCION_ESTADO } from "../lib/estadosSolicitud";
import RangoFechasSelector from "./RangoFechasSelector";
import SelectorModerno from "./SelectorModerno";
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
  REVISADO: "bg-sky-100 text-sky-800",
  PAGADA: "bg-orange-100 text-orange-800",
};

// Sentinel para el filtro "Sin supervisor (solicita directo)" — no es un
// id real de colaborador, así que no puede chocar con uno.
const SIN_SUPERVISOR = "__sin_supervisor__";

export default function PanelHistorialCoordinador() {
  const [vista, setVista] = useState<"lista" | "colaborador">("lista");
  const [desde, setDesde] = useState(fechaHoyTexto);
  const [hasta, setHasta] = useState(fechaHoyTexto);
  const [estado, setEstado] = useState("");
  const [supervisorId, setSupervisorId] = useState("");
  const [colaboradorId, setColaboradorId] = useState("");

  // "Sin áreas asignadas" se resuelve en el cliente (mismo chequeo que ya
  // hace el backend al armar el combo de colaboradores, vía el 403 de esa
  // misma consulta) para que la pantalla se muestre de inmediato en vez
  // de esperar esa consulta antes de mostrar nada.
  const [sinAsignaciones, setSinAsignaciones] = useState(false);

  // Opciones del combo "Supervisor": solo quienes tienen algo de su
  // equipo con actividad en el rango/estado elegidos, más "Sin
  // supervisor" para quienes solicitan directo con su propio PIN.
  const [supervisoresOpciones, setSupervisoresOpciones] = useState<{ id: string; label: string }[]>([]);
  useEffect(() => {
    if (!desde || !hasta) return;
    const params = new URLSearchParams({ desde, hasta });
    if (estado) params.set("estado", estado);
    let cancelado = false;
    fetch(`/api/coordinador/historial/supervisores-filtro?${params.toString()}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { supervisores: { id: string; nombre: string }[]; haySinSupervisor: boolean } | null) => {
        if (cancelado || !data) return;
        const opciones = data.supervisores.map((s) => ({ id: s.id, label: s.nombre }));
        if (data.haySinSupervisor) opciones.push({ id: SIN_SUPERVISOR, label: "Sin supervisor (solicita directo)" });
        setSupervisoresOpciones(opciones);
        setSupervisorId((actual) => (actual && !opciones.some((o) => o.id === actual) ? "" : actual));
      })
      .catch(() => {});
    return () => {
      cancelado = true;
    };
  }, [desde, hasta, estado]);

  // Opciones del combo "Colaborador": solo quienes tienen actividad en el
  // rango/estado/supervisor elegidos, no la lista completa dentro del
  // alcance (que puede ser grande y no tiene relación con lo que se está
  // por buscar).
  const [colaboradores, setColaboradores] = useState<{ id: string; nombreCompleto: string }[]>([]);
  useEffect(() => {
    if (!desde || !hasta) return;
    const params = new URLSearchParams({ desde, hasta });
    if (estado) params.set("estado", estado);
    if (supervisorId) params.set("supervisorId", supervisorId);
    let cancelado = false;
    fetch(`/api/coordinador/historial/colaboradores-filtro?${params.toString()}`)
      .then((res) => {
        if (cancelado) return null;
        setSinAsignaciones(res.status === 403);
        return res.ok ? res.json() : [];
      })
      .then((data) => {
        if (cancelado || !data) return;
        setColaboradores(data);
        setColaboradorId((actual) => (actual && !data.some((c: { id: string }) => c.id === actual) ? "" : actual));
      })
      .catch(() => {});
    return () => {
      cancelado = true;
    };
  }, [desde, hasta, estado, supervisorId]);
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
    "historial-coordinador"
  );

  const opcionesColaborador = [
    { id: "", label: "Todos los colaboradores" },
    ...colaboradores.map((c) => ({ id: c.id, label: c.nombreCompleto })),
  ];

  const parametrosBase = () => {
    const params = new URLSearchParams({ desde, hasta });
    if (estado) params.set("estado", estado);
    if (supervisorId) params.set("supervisorId", supervisorId);
    if (colaboradorId) params.set("colaboradorId", colaboradorId);
    return params;
  };

  const cambiarSupervisor = (v: string) => {
    setSupervisorId(v);
    setColaboradorId("");
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

  // Detalle (código/fecha/ruta/valor/estado) de UN colaborador, pedido
  // solo cuando lo expande — no viaja con la lista completa.
  const cargarItemsColaborador = async (idColaborador: string): Promise<Fila[]> => {
    const params = new URLSearchParams({ desde, hasta, colaboradorId: idColaborador, pagina: "1" });
    if (estado) params.set("estado", estado);
    const res = await fetch(`/api/coordinador/historial?${params.toString()}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.items;
  };

  const urlExportar = () => `/api/coordinador/historial/exportar?${parametrosBase().toString()}`;
  // Exportar usa los mismos filtros que "Buscar", así que solo habilitamos
  // el botón cuando esa búsqueda ya trajo resultados — evita generar un
  // Excel vacío cuando el rango/filtro elegido no tiene datos.
  const hayDatos = vista === "lista" ? (items?.length ?? 0) > 0 : (filasColaborador?.length ?? 0) > 0;
  const puedeExportar = !!desde && !!hasta && hayDatos;

  return (
    <div className="flex-1 px-4 sm:px-8 py-5 space-y-4">
      <div className="flex flex-wrap items-baseline gap-2">
        <h1 className="text-lg sm:text-xl font-bold">Historial</h1>
        <span className="hidden sm:inline text-xs text-neutral-500 dark:text-neutral-400">· Solicitudes revisadas y pagadas</span>
      </div>

      {sinAsignaciones && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-xl px-4 py-3">
          No tienes ninguna Empresa/Sitio/Área asignada todavía.
        </div>
      )}

      <div className="bg-neutral-50 dark:bg-neutral-900 rounded-2xl p-5 shadow-sm ring-1 ring-black/5 dark:ring-white/10 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
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
            <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Supervisor</label>
            <div className="mt-1.5">
              <ComboboxBuscable
                opciones={[{ id: "", label: "Todos" }, ...supervisoresOpciones]}
                value={supervisorId}
                onChange={cambiarSupervisor}
                placeholder="Todos"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Colaborador</label>
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

      {cargando && <TablaEsqueleto columnas={vista === "lista" ? 6 : 3} />}

      {!cargando && vista === "colaborador" && filasColaborador && (
        <div className="bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 rounded-2xl overflow-hidden shadow-sm ring-1 ring-black/5 dark:ring-white/10">
          <TablaColaboradores
            filas={filasColaborador}
            cargarItems={cargarItemsColaborador}
            clave={(s) => s.id}
            columnas={[
              { encabezado: "Código", render: (s) => <span className="font-mono">{s.codigo}</span> },
              { encabezado: "Fecha", render: (s) => formatearFecha(s.fecha) },
              { encabezado: "Ruta", render: (s) => s.rutaLabel },
              { encabezado: "Valor", render: (s) => formatearMoneda(s.montoTotal) },
              {
                encabezado: "Estado",
                render: (s) => (
                  <span
                    title={DESCRIPCION_ESTADO[s.estado]}
                    className={`text-[11px] px-2 py-0.5 rounded-full ${ESTILOS_ESTADO[s.estado] ?? "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300"}`}
                  >
                    {s.estado}
                  </span>
                ),
              },
            ]}
            vacio="No hay resultados en ese rango"
          />
          <Paginacion paginaActual={paginaColab} totalPaginas={totalPaginasColab} onCambiarPagina={buscar} deshabilitado={cargando} />
        </div>
      )}

      {!cargando && vista === "lista" && items && (
        <div className="bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 rounded-2xl overflow-hidden shadow-sm ring-1 ring-black/5 dark:ring-white/10">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-xs">
              <thead className="bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Código</th>
                  <EncabezadoOrdenable campo="fecha" ordenActivo={orden} onOrdenar={ordenar}>Fecha</EncabezadoOrdenable>
                  <EncabezadoOrdenable campo="nombreColaborador" ordenActivo={orden} onOrdenar={ordenar}>Colaborador</EncabezadoOrdenable>
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
                    <td className="px-4 py-3">{s.nombreColaborador}</td>
                    <td className="px-4 py-3 text-neutral-600">{s.rutaLabel}</td>
                    <td className="px-4 py-3">{formatearMoneda(s.montoTotal)}</td>
                    <td className="px-4 py-3">
                      <span title={DESCRIPCION_ESTADO[s.estado]} className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${ESTILOS_ESTADO[s.estado] ?? "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300"}`}>
                        {s.estado}
                      </span>
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-10">
                      <EstadoVacio mensaje="No hay resultados en ese rango" />
                    </td>
                  </tr>
                )}
              </tbody>
              {items.length > 0 && (
                <tfoot>
                  <tr className="border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/60 font-semibold">
                    <td className="px-4 py-3" colSpan={4}>Total del rango</td>
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
