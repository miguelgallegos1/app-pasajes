// components/PanelHistorialJefe.tsx
// Historial completo (cualquier estado) para el rol Jefe — solo consulta,
// sin restricción de alcance. Filtros en cascada Empresa -> Sitio -> Área
// -> Colaborador más Estado, vista alterna agrupada por colaborador, y
// exportación a Excel.

"use client";

import { useState, useMemo, useEffect } from "react";
import { formatearMoneda } from "../lib/formato";
import { DESCRIPCION_ESTADO, ESTILOS_ESTADO } from "../lib/estadosSolicitud";
import RangoFechasSelector from "./RangoFechasSelector";
import SelectorModerno from "./SelectorModerno";
import ComboboxBuscable from "./ComboboxBuscable";
import BarraFiltros, { CampoFiltro, chipOpcion, chips, CamposEmpresaSitioArea, chipsEmpresaSitioArea } from "./BarraFiltros";
import Paginacion from "./Paginacion";
import TablaEsqueleto from "./TablaEsqueleto";
import EstadoVacio from "./EstadoVacio";
import Avatar from "./Avatar";
import SelectorVista from "./SelectorVista";
import EncabezadoOrdenable from "./EncabezadoOrdenable";
import { formatearFecha, fechaHoyTexto } from "../lib/fechas";
import { useOrdenTabla } from "../lib/useOrdenTabla";
import { useFiltroEmpresaSitioArea } from "../lib/useFiltroEmpresaSitioArea";
import TablaColaboradores, { type FilaColaborador } from "./TablaColaboradores";
import { IconoDescargar } from "./Icons";

type Empresa = { id: string; nombre: string };
type Sitio = { id: string; nombre: string; empresaId: string };
type Area = { id: string; nombre: string; sitioId: string };
type Fila = { id: string; codigo: string; fecha: string; montoTotal: number; estado: string; rutaLabel: string; nombreColaborador: string };

type CampoOrden = "fecha" | "nombreColaborador" | "rutaLabel" | "montoTotal" | "estado";
const VALOR_ORDEN: Record<CampoOrden, (f: Fila) => string | number> = {
  fecha: (f) => f.fecha,
  nombreColaborador: (f) => f.nombreColaborador,
  rutaLabel: (f) => f.rutaLabel,
  montoTotal: (f) => f.montoTotal,
  estado: (f) => f.estado,
};

const OPCIONES_ESTADO = [
  { value: "", label: "Todos" },
  { value: "PENDIENTE", label: "Pendiente" },
  { value: "APROBADA", label: "Aprobada" },
  { value: "RECHAZADA", label: "Rechazada" },
  { value: "REVISADO", label: "Revisada" },
  { value: "PAGADA", label: "Pagada" },
];

export default function PanelHistorialJefe() {
  const [vista, setVista] = useState<"lista" | "colaborador">("lista");
  const [desde, setDesde] = useState(fechaHoyTexto);
  const [hasta, setHasta] = useState(fechaHoyTexto);
  const [estado, setEstado] = useState("");
  const [colaboradorId, setColaboradorId] = useState("");

  // Empresa/Sitio/Área para los combos de filtro: se piden al montar en
  // vez de esperar a que el servidor las traiga antes de mostrar la
  // pantalla — los controles aparecen de una, y los combos se llenan un
  // instante después.
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [sitios, setSitios] = useState<Sitio[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  useEffect(() => {
    fetch("/api/jefe/historial/filtros")
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
  // rango y los filtros (Empresa/Sitio/Área/Estado) elegidos, no la lista
  // completa de la empresa (que puede ser grande y no tiene relación con
  // la búsqueda).
  const filtroUbicacion = useFiltroEmpresaSitioArea(sitios, areas, () => setColaboradorId(""));
  const { empresaFiltro, sitioFiltro, areaFiltro, cambiarEmpresaFiltro } = filtroUbicacion;

  const [colaboradores, setColaboradores] = useState<{ id: string; nombreCompleto: string }[]>([]);
  useEffect(() => {
    if (!desde || !hasta) return;
    const params = new URLSearchParams({ desde, hasta });
    if (empresaFiltro) params.set("empresaId", empresaFiltro);
    if (sitioFiltro) params.set("sitioId", sitioFiltro);
    if (areaFiltro) params.set("areaId", areaFiltro);
    if (estado) params.set("estado", estado);
    let cancelado = false;
    fetch(`/api/jefe/historial/colaboradores-filtro?${params.toString()}`)
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
  }, [desde, hasta, empresaFiltro, sitioFiltro, areaFiltro, estado]);

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
    "historial-jefe"
  );

  const colaboradoresOpciones = useMemo(
    () => colaboradores.map((c) => ({ id: c.id, label: c.nombreCompleto })),
    [colaboradores]
  );

  const parametrosBase = () => {
    const params = new URLSearchParams({ desde, hasta });
    if (estado) params.set("estado", estado);
    if (empresaFiltro) params.set("empresaId", empresaFiltro);
    if (sitioFiltro) params.set("sitioId", sitioFiltro);
    if (areaFiltro) params.set("areaId", areaFiltro);
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
        const res = await fetch(`/api/jefe/historial?${params.toString()}`);
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
        const res = await fetch(`/api/jefe/historial/colaboradores?${params.toString()}`);
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

  // Busca sola al entrar, al cambiar el rango de fechas o la vista y al
  // quitar un chip; el resto de filtros se aplica junto desde el panel.
  // En un efecto porque buscar() arma la URL con el estado de ESTE render
  // — recién el siguiente ve el cambio.
  const [pedidoBusqueda, setPedidoBusqueda] = useState(1);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- dispara una consulta de red
    if (pedidoBusqueda) buscar(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pedidoBusqueda]);
  const rebuscar = () => setPedidoBusqueda((n) => n + 1);

  const empresasOpciones = useMemo(() => empresas.map((e) => ({ id: e.id, label: e.nombre })), [empresas]);

  const chipsFiltros = chips(
    chipOpcion("Estado", OPCIONES_ESTADO.map((o) => ({ id: o.value, label: o.label })), estado, () => { setEstado(""); rebuscar(); }),
    ...chipsEmpresaSitioArea(empresasOpciones, filtroUbicacion, rebuscar),
    chipOpcion("Colaborador", colaboradoresOpciones, colaboradorId, () => { setColaboradorId(""); rebuscar(); })
  );

  const limpiarFiltros = () => {
    setEstado("");
    cambiarEmpresaFiltro("");
    setColaboradorId("");
    rebuscar();
  };

  const cambiarVista = (v: "lista" | "colaborador") => {
    setVista(v);
    setItems(null);
    setFilasColaborador(null);
    setError("");
    rebuscar();
  };

  // Detalle (código/fecha/ruta/valor/estado) de UN colaborador, pedido
  // solo cuando lo expande — no viaja con la lista completa.
  const cargarItemsColaborador = async (idColaborador: string): Promise<Fila[]> => {
    const params = new URLSearchParams({ desde, hasta, colaboradorId: idColaborador, pagina: "1" });
    if (estado) params.set("estado", estado);
    const res = await fetch(`/api/jefe/historial?${params.toString()}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.items;
  };

  const urlExportar = () => `/api/jefe/historial/exportar?${parametrosBase().toString()}`;
  // Exportar usa los mismos filtros que "Buscar", así que solo habilitamos
  // el botón cuando esa búsqueda ya trajo resultados — evita generar un
  // Excel vacío cuando el rango/filtro elegido no tiene datos.
  const hayDatos = vista === "lista" ? (items?.length ?? 0) > 0 : (filasColaborador?.length ?? 0) > 0;
  const puedeExportar = !!desde && !!hasta && hayDatos;

  return (
    <div className="flex-1 px-4 sm:px-8 pb-5 space-y-4">

      <BarraFiltros
        chips={chipsFiltros}
        onLimpiar={limpiarFiltros}
        onAplicar={() => buscar(1)}
        aplicando={cargando}
        textoAplicar="Aplicar"
        destacado={
          <RangoFechasSelector desde={desde} hasta={hasta} onChange={(d, h) => { setDesde(d); setHasta(h); rebuscar(); }} />
        }
        acciones={
          <>
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
          </>
        }
      >
        <CampoFiltro etiqueta="Estado">
          <SelectorModerno opciones={OPCIONES_ESTADO} value={estado} onChange={setEstado} placeholder="Todos" />
        </CampoFiltro>
        <CamposEmpresaSitioArea empresas={empresasOpciones} filtro={filtroUbicacion} />
        <CampoFiltro etiqueta="Colaborador">
          <ComboboxBuscable opciones={colaboradoresOpciones} value={colaboradorId} onChange={setColaboradorId} placeholder="Todos" />
        </CampoFiltro>
      </BarraFiltros>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {cargando && <TablaEsqueleto columnas={vista === "lista" ? 6 : 3} />}

      {!cargando && vista === "colaborador" && filasColaborador && (
        <div className="bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 rounded-2xl overflow-hidden shadow-sm ring-1 ring-black/5 dark:ring-white/10">
          <TablaColaboradores
            filas={filasColaborador}
            cargarItems={cargarItemsColaborador}
            clave={(s) => s.id}
            claveOrden="jefe-historial-colaborador"
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
            vacio="Sin resultados para ese rango"
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
                {itemsOrdenados.map((s, i) => (
                  <tr key={s.id} className="border-t border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/60 transition">
                    <td className="px-4 py-3 font-mono font-bold tracking-widest text-neutral-500 dark:text-neutral-400">{s.codigo}</td>
                    <td className="px-4 py-3">{formatearFecha(s.fecha)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar nombre={s.nombreColaborador} indice={i} className="w-7 h-7 text-[11px]" />
                        <span>{s.nombreColaborador}</span>
                      </div>
                    </td>
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
                      <EstadoVacio mensaje="Sin resultados para ese rango" />
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
