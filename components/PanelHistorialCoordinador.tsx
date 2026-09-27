// components/PanelHistorialCoordinador.tsx
// Historial de Revisadas + Pagadas dentro del alcance del Coordinador
// (solo consulta, sin acciones — para actuar se usa la pantalla de
// Revisión). Buscador (fechas, Empresa/Sitio/Área, estado, supervisor,
// colaborador), vista alterna agrupada por colaborador, y exportación a
// Excel.

"use client";

import { useState, useEffect } from "react";
import { formatearMoneda } from "../lib/formato";
import { DESCRIPCION_ESTADO, ESTILOS_ESTADO } from "../lib/estadosSolicitud";
import SelectorModerno from "./SelectorModerno";
import { chipOpcion } from "./BarraFiltros";
import { useBuscadorHistorial } from "../lib/useBuscadorHistorial";
import BuscadorHistorial, { Campo, AvisoSinBusqueda } from "./BuscadorHistorial";
import Paginacion from "./Paginacion";
import TablaEsqueleto from "./TablaEsqueleto";
import { useReportarCarga } from "../lib/cargaGlobal";
import EstadoVacio from "./EstadoVacio";
import SelectorVista from "./SelectorVista";
import { GrupoSalidas, BotonSalida } from "./AccionesSalida";
import EncabezadoOrdenable from "./EncabezadoOrdenable";
import { formatearFecha } from "../lib/fechas";
import { useOrdenServidor, agregarOrdenAParams } from "../lib/useOrdenTabla";
import TablaColaboradores, { type FilaColaborador, type CampoOrdenColaborador } from "./TablaColaboradores";
import { IconoDescargar } from "./Icons";

type Fila = {
  id: string;
  codigo: string;
  fecha: string;
  montoTotal: number;
  estado: string;
  rutaLabel: string;
  nombreColaborador: string;
  codigoNomina: string | null;
  revisadoPor: string | null;
};

type CampoOrden = "fecha" | "nombreColaborador" | "rutaLabel" | "montoTotal" | "estado";

const OPCIONES_ESTADO = [
  { value: "", label: "Todos" },
  { value: "REVISADO", label: "Revisada" },
  { value: "PAGADA", label: "Pagada" },
];

export default function PanelHistorialCoordinador() {
  const [vista, setVista] = useState<"lista" | "colaborador">("lista");
  // Filtros (fechas, Empresa/Sitio/Área, Supervisor, Colaborador): nada se
  // busca hasta pulsar Buscar — ver lib/useBuscadorHistorial.ts.
  const buscador = useBuscadorHistorial({ conSupervisor: true });
  const [estado, setEstado] = useState("");

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

  const { orden, ordenar: ordenarLista } = useOrdenServidor<CampoOrden>("historial-coordinador");
  const { orden: ordenColab, ordenar: ordenarColabBase } = useOrdenServidor<CampoOrdenColaborador>("coordinador-historial-colaborador");

  // Siempre con la foto de la última búsqueda (no lo que se está cambiando).
  const parametrosAplicados = () => new URLSearchParams(buscador.aplicados ?? "");

  const buscar = async (paginaNueva = 1) => {
    if (!buscador.aplicados) return;
    setCargando(true);
    setError("");
    const params = parametrosAplicados();
    params.set("pagina", String(paginaNueva));
    agregarOrdenAParams(params, vista === "lista" ? orden : ordenColab);

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

  // buscar() arma la URL con el estado de ESTE render: tras aplicar los
  // filtros (o cambiar orden/vista), la consulta sale en el render siguiente.
  const [pedidoBusqueda, setPedidoBusqueda] = useState(0);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- dispara una consulta de red
    if (pedidoBusqueda) buscar(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pedidoBusqueda]);
  const rebuscar = () => setPedidoBusqueda((n) => n + 1);
  const buscarConFiltros = () => {
    if (buscador.aplicar({ estado })) rebuscar();
  };

  // El orden lo aplica el servidor a TODO el rango: al cambiarlo se vuelve
  // a pedir la página 1 (ordenar en memoria solo reordenaba la página visible).
  const ordenar = (campo: CampoOrden) => {
    ordenarLista(campo);
    if (buscador.aplicados) rebuscar();
  };
  const ordenarColab = (campo: CampoOrdenColaborador) => {
    ordenarColabBase(campo);
    if (buscador.aplicados) rebuscar();
  };

  const cambiarVista = (v: "lista" | "colaborador") => {
    setVista(v);
    setItems(null);
    setFilasColaborador(null);
    setError("");
    if (buscador.aplicados) rebuscar();
  };

  // Detalle (código/fecha/ruta/valor/estado) de UN colaborador, pedido
  // solo cuando lo expande — no viaja con la lista completa.
  const cargarItemsColaborador = async (idColaborador: string): Promise<Fila[]> => {
    const params = parametrosAplicados();
    params.set("colaboradorId", idColaborador);
    params.set("pagina", "1");
    const res = await fetch(`/api/coordinador/historial?${params.toString()}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.items;
  };

  const urlExportar = () => `/api/coordinador/historial/exportar?${parametrosAplicados().toString()}`;
  // Exporta con los filtros de la última búsqueda, solo si trajo resultados
  // — evita generar un Excel vacío.
  const hayDatos = vista === "lista" ? (items?.length ?? 0) > 0 : (filasColaborador?.length ?? 0) > 0;
  const puedeExportar = !!buscador.aplicados && !cargando && hayDatos;

  return (
    <div className="flex-1 px-4 sm:px-8 pb-5 space-y-4">
      <BuscadorHistorial
        buscador={buscador}
        onBuscar={buscarConFiltros}
        buscando={cargando}
        extrasParams={{ estado }}
        extrasChips={[chipOpcion("Estado", OPCIONES_ESTADO.map((o) => ({ id: o.value, label: o.label })), estado, () => setEstado(""))]}
        onLimpiarExtras={() => setEstado("")}
        extras={
          <Campo etiqueta="Estado">
            <SelectorModerno opciones={OPCIONES_ESTADO} value={estado} onChange={setEstado} placeholder="Todos" />
          </Campo>
        }
        vista={<SelectorVista valor={vista} onCambiar={cambiarVista} segmentado className="w-full sm:w-auto" />}
        salidas={
          <GrupoSalidas>
            <BotonSalida
              href={urlExportar()}
              icono={IconoDescargar}
              etiqueta="Excel"
              titulo={puedeExportar ? "Exportar a Excel con los filtros de la búsqueda" : "Busca primero: no hay resultados para exportar"}
              deshabilitado={!puedeExportar}
            />
          </GrupoSalidas>
        }
      />

      {!buscador.aplicados && !cargando && <AvisoSinBusqueda faltante={buscador.faltante} />}

      {error && <p className="text-sm text-red-600">{error}</p>}

      {cargando && <TablaEsqueleto columnas={vista === "lista" ? 7 : 3} />}

      {!cargando && vista === "colaborador" && filasColaborador && (
        <div className="bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 rounded-2xl overflow-hidden shadow-sm ring-1 ring-black/5 dark:ring-white/10">
          <TablaColaboradores
            filas={filasColaborador}
            cargarItems={cargarItemsColaborador}
            clave={(s) => s.id}
            ordenServidor={{ orden: ordenColab, ordenar: ordenarColab }}
            columnas={[
              { encabezado: "Código", render: (s) => <span className="font-mono">{s.codigoNomina ?? "—"}</span> },
              { encabezado: "Fecha", render: (s) => formatearFecha(s.fecha) },
              { encabezado: "Ruta", render: (s) => s.rutaLabel },
              { encabezado: "Valor", render: (s) => formatearMoneda(s.montoTotal) },
              { encabezado: "Revisado por", render: (s) => s.revisadoPor ?? "—" },
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
            <table className="w-full min-w-[780px] text-xs">
              <thead className="bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Código</th>
                  <EncabezadoOrdenable campo="fecha" ordenActivo={orden} onOrdenar={ordenar}>Fecha</EncabezadoOrdenable>
                  <EncabezadoOrdenable campo="nombreColaborador" ordenActivo={orden} onOrdenar={ordenar}>Colaborador</EncabezadoOrdenable>
                  <EncabezadoOrdenable campo="rutaLabel" ordenActivo={orden} onOrdenar={ordenar}>Ruta</EncabezadoOrdenable>
                  <EncabezadoOrdenable campo="montoTotal" ordenActivo={orden} onOrdenar={ordenar}>Valor</EncabezadoOrdenable>
                  <th className="px-4 py-3 font-medium">Revisado por</th>
                  <EncabezadoOrdenable campo="estado" ordenActivo={orden} onOrdenar={ordenar}>Estado</EncabezadoOrdenable>
                </tr>
              </thead>
              <tbody>
                {items.map((s) => (
                  <tr key={s.id} className="border-t border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/60 transition">
                    <td className="px-4 py-3 font-mono font-semibold text-neutral-500 dark:text-neutral-400">{s.codigoNomina ?? "—"}</td>
                    <td className="px-4 py-3">{formatearFecha(s.fecha)}</td>
                    <td className="px-4 py-3">{s.nombreColaborador}</td>
                    <td className="px-4 py-3 text-neutral-600">{s.rutaLabel}</td>
                    <td className="px-4 py-3">{formatearMoneda(s.montoTotal)}</td>
                    <td className="px-4 py-3 text-neutral-600 dark:text-neutral-400">{s.revisadoPor ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span title={DESCRIPCION_ESTADO[s.estado]} className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${ESTILOS_ESTADO[s.estado] ?? "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300"}`}>
                        {s.estado}
                      </span>
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10">
                      <EstadoVacio mensaje="Sin resultados para ese rango" />
                    </td>
                  </tr>
                )}
              </tbody>
              {items.length > 0 && (
                <tfoot>
                  <tr className="border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/60 font-semibold">
                    <td className="px-4 py-3" colSpan={4}>Total del rango</td>
                    <td className="px-4 py-3" colSpan={3}>{formatearMoneda(totalMonto)}</td>
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
