// components/PanelHistorialNomina.tsx
// Historial de PAGADAS (antes "Historial de Finanzas"): filtros en cascada
// Empresa -> Sitio -> Área -> Colaborador, rango de fechas obligatorio,
// vista alterna agrupada por colaborador, y exportación a Excel.

"use client";

import { useState, useMemo, useEffect } from "react";
import { formatearMoneda } from "../lib/formato";
import RangoFechasSelector from "./RangoFechasSelector";
import ComboboxBuscable from "./ComboboxBuscable";
import BarraFiltros, { CampoFiltro, chipOpcion, chips, CamposEmpresaSitioArea, chipsEmpresaSitioArea } from "./BarraFiltros";
import Paginacion from "./Paginacion";
import TablaEsqueleto from "./TablaEsqueleto";
import { useReportarCarga } from "../lib/cargaGlobal";
import EstadoVacio from "./EstadoVacio";
import SelectorVista from "./SelectorVista";
import EncabezadoOrdenable from "./EncabezadoOrdenable";
import { formatearFecha, formatearFechaEcuador, fechaHoyTexto } from "../lib/fechas";
import { useOrdenServidor, agregarOrdenAParams } from "../lib/useOrdenTabla";
import { useFiltroEmpresaSitioArea } from "../lib/useFiltroEmpresaSitioArea";
import TablaColaboradores, { type FilaColaborador, type CampoOrdenColaborador } from "./TablaColaboradores";
import { IconoDescargar } from "./Icons";

type Empresa = { id: string; nombre: string };
type Sitio = { id: string; nombre: string; empresaId: string };
type Area = { id: string; nombre: string; sitioId: string };
type Fila = { id: string; codigo: string; fecha: string; fechaPago: string | null; montoTotal: number; nombreColaborador: string; codigoNomina: string | null; pagadoPor: string | null; rutaLabel: string };

type CampoOrden = "fecha" | "nombreColaborador" | "rutaLabel" | "montoTotal";

export default function PanelHistorialNomina() {
  const [vista, setVista] = useState<"lista" | "colaborador">("lista");
  const [desde, setDesde] = useState(fechaHoyTexto);
  const [hasta, setHasta] = useState(fechaHoyTexto);
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

  const filtroUbicacion = useFiltroEmpresaSitioArea(sitios, areas, () => setColaboradorId(""));
  const { empresaFiltro, sitioFiltro, areaFiltro, cambiarEmpresaFiltro } = filtroUbicacion;

  // Opciones del combo "Colaborador": solo quienes tienen actividad en el
  // rango y los filtros Empresa/Sitio/Área elegidos, no la lista completa
  // de la empresa (que puede ser grande y no tiene relación con la
  // búsqueda).
  const [colaboradores, setColaboradores] = useState<{ id: string; nombreCompleto: string }[]>([]);
  useEffect(() => {
    if (!desde || !hasta) return;
    const params = new URLSearchParams({ desde, hasta });
    if (empresaFiltro) params.set("empresaId", empresaFiltro);
    if (sitioFiltro) params.set("sitioId", sitioFiltro);
    if (areaFiltro) params.set("areaId", areaFiltro);
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
  }, [desde, hasta, empresaFiltro, sitioFiltro, areaFiltro]);

  const [items, setItems] = useState<Fila[] | null>(null);
  const [totalMonto, setTotalMonto] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [cargando, setCargando] = useState(false);
  // Cada búsqueda enciende la franja naranja de arriba, para que se note
  // que está trabajando (la tabla de relleno sola pasaba desapercibida).
  useReportarCarga(cargando);
  const [error, setError] = useState("");

  const [filasColaborador, setFilasColaborador] = useState<FilaColaborador[] | null>(null);
  const [paginaColab, setPaginaColab] = useState(1);
  const [totalPaginasColab, setTotalPaginasColab] = useState(1);

  const { orden, ordenar: ordenarLista } = useOrdenServidor<CampoOrden>("historial-nomina");
  const { orden: ordenColab, ordenar: ordenarColabBase } = useOrdenServidor<CampoOrdenColaborador>("nomina-historial-colaborador");

  const colaboradoresOpciones = useMemo(
    () => colaboradores.map((c) => ({ id: c.id, label: c.nombreCompleto })),
    [colaboradores]
  );

  const parametrosBase = () => {
    const params = new URLSearchParams({ desde, hasta });
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
    agregarOrdenAParams(params, vista === "lista" ? orden : ordenColab);

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

  // El orden lo aplica el servidor a TODO el rango: al cambiarlo se vuelve
  // a pedir la página 1 (ordenar en memoria solo reordenaba la página visible).
  const ordenar = (campo: CampoOrden) => {
    ordenarLista(campo);
    rebuscar();
  };
  const ordenarColab = (campo: CampoOrdenColaborador) => {
    ordenarColabBase(campo);
    rebuscar();
  };

  const empresasOpciones = useMemo(() => empresas.map((e) => ({ id: e.id, label: e.nombre })), [empresas]);

  const chipsFiltros = chips(
    ...chipsEmpresaSitioArea(empresasOpciones, filtroUbicacion, rebuscar),
    chipOpcion("Colaborador", colaboradoresOpciones, colaboradorId, () => { setColaboradorId(""); rebuscar(); })
  );

  const limpiarFiltros = () => {
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
            ordenServidor={{ orden: ordenColab, ordenar: ordenarColab }}
            columnas={[
              { encabezado: "Código", render: (s) => <span className="font-mono">{s.codigoNomina ?? "—"}</span> },
              {
                encabezado: "Fecha",
                render: (s) => (
                  <>
                    <p>{formatearFecha(s.fecha)}</p>
                    {s.fechaPago && (
                      <p className="text-[11px] text-neutral-400 dark:text-neutral-500">Pagada {formatearFechaEcuador(s.fechaPago)}</p>
                    )}
                  </>
                ),
              },
              { encabezado: "Ruta", render: (s) => s.rutaLabel },
              { encabezado: "Valor", render: (s) => formatearMoneda(s.montoTotal) },
              { encabezado: "Pagado por", render: (s) => s.pagadoPor ?? "—" },
            ]}
            vacio="No hay pagos registrados en ese rango"
          />
          <Paginacion paginaActual={paginaColab} totalPaginas={totalPaginasColab} onCambiarPagina={buscar} deshabilitado={cargando} />
        </div>
      )}

      {!cargando && vista === "lista" && items && (
        <div className="bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 rounded-2xl overflow-hidden shadow-sm ring-1 ring-black/5 dark:ring-white/10">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-xs">
              <thead className="bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Código</th>
                  <EncabezadoOrdenable campo="fecha" ordenActivo={orden} onOrdenar={ordenar}>Fecha del pasaje</EncabezadoOrdenable>
                  <EncabezadoOrdenable campo="nombreColaborador" ordenActivo={orden} onOrdenar={ordenar}>Colaborador</EncabezadoOrdenable>
                  <EncabezadoOrdenable campo="rutaLabel" ordenActivo={orden} onOrdenar={ordenar}>Ruta</EncabezadoOrdenable>
                  <EncabezadoOrdenable campo="montoTotal" ordenActivo={orden} onOrdenar={ordenar}>Valor</EncabezadoOrdenable>
                  <th className="px-4 py-3 font-medium">Pagado por</th>
                </tr>
              </thead>
              <tbody>
                {items.map((s) => (
                  <tr key={s.id} className="border-t border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/60 transition">
                    <td className="px-4 py-3 font-mono font-semibold text-neutral-500 dark:text-neutral-400">{s.codigoNomina ?? "—"}</td>
                    <td className="px-4 py-3">
                      <p>{formatearFecha(s.fecha)}</p>
                      {s.fechaPago && (
                        <p className="text-[11px] text-neutral-400 dark:text-neutral-500">
                          Pagada: {formatearFechaEcuador(s.fechaPago)}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">{s.nombreColaborador}</td>
                    <td className="px-4 py-3 text-neutral-600">{s.rutaLabel}</td>
                    <td className="px-4 py-3">{formatearMoneda(s.montoTotal)}</td>
                    <td className="px-4 py-3 text-neutral-600 dark:text-neutral-400">{s.pagadoPor ?? "—"}</td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-10">
                      <EstadoVacio mensaje="No hay pagos registrados en ese rango" />
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
