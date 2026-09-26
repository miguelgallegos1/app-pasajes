// components/PanelHistorialColaborador.tsx
// Historial de solicitudes Aprobadas y/o Pagadas para un colaborador o
// supervisor: filtro de fechas, estado y (si es supervisor) a quién del
// equipo mirar. Reemplaza el modal que vivía dentro de "Mis Pasajes" para
// que "Historial" sea una página propia del menú, igual que en los demás roles.

"use client";

import { useState, useEffect } from "react";
import { formatearMoneda } from "../lib/formato";
import { DESCRIPCION_ESTADO, ESTILOS_ESTADO } from "../lib/estadosSolicitud";
import RangoFechasSelector from "./RangoFechasSelector";
import SelectorModerno from "./SelectorModerno";
import ComboboxBuscable from "./ComboboxBuscable";
import BarraFiltros, { CampoFiltro, chipOpcion, chips } from "./BarraFiltros";
import Paginacion from "./Paginacion";
import TablaEsqueleto from "./TablaEsqueleto";
import EstadoVacio from "./EstadoVacio";
import EncabezadoOrdenable from "./EncabezadoOrdenable";
import { formatearFecha, fechaHoyTexto } from "../lib/fechas";
import { useOrdenServidor, agregarOrdenAParams } from "../lib/useOrdenTabla";
import { useHistorialLista } from "../lib/useHistorialLista";

type Fila = {
  id: string;
  codigo: string;
  fecha: string;
  montoTotal: number;
  estado: string;
  rutaLabel: string;
  nombreColaborador: string;
  codigoNomina: string | null;
};

type CampoOrden = "fecha" | "nombreColaborador" | "rutaLabel" | "montoTotal" | "estado";

const OPCIONES_ESTADO = [
  { value: "", label: "Todos" },
  { value: "APROBADA", label: "Aprobada" },
  { value: "PAGADA", label: "Pagada" },
];

export default function PanelHistorialColaborador() {
  const [esSupervisor, setEsSupervisor] = useState(false);
  const [equipo, setEquipo] = useState<{ id: string; nombreCompleto: string }[]>([]);

  useEffect(() => {
    let cancelado = false;
    fetch("/api/mis-pasajes/historial/equipo")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { esSupervisor: boolean; equipo: { id: string; nombreCompleto: string }[] } | null) => {
        if (cancelado || !data) return;
        setEsSupervisor(data.esSupervisor);
        setEquipo(data.equipo);
      })
      .catch(() => {});
    return () => {
      cancelado = true;
    };
  }, []);

  const [desde, setDesde] = useState(fechaHoyTexto);
  const [hasta, setHasta] = useState(fechaHoyTexto);
  const [estado, setEstado] = useState("");
  const [colaboradorId, setColaboradorId] = useState("");
  const { orden, ordenar: ordenarBase } = useOrdenServidor<CampoOrden>("historial-colaborador");
  const { items, totalMonto, pagina, totalPaginas, cargando, error, buscar } = useHistorialLista<Fila>(
    (paginaNueva) => {
      if (!desde || !hasta) return null;
      const params = new URLSearchParams({ desde, hasta, pagina: String(paginaNueva) });
      agregarOrdenAParams(params, orden);
      if (estado) params.set("estado", estado);
      if (colaboradorId) params.set("colaboradorId", colaboradorId);
      return `/api/solicitudes/historial?${params.toString()}`;
    }
  );


  const opcionesColaborador = [
    { id: "", label: "Todos" },
    ...equipo.map((c) => ({ id: c.id, label: c.nombreCompleto })),
  ];

  // Busca sola al entrar, al cambiar el rango de fechas y al quitar un
  // chip; Estado (y Colaborador, si es supervisor) se aplican desde el
  // panel. En un efecto porque buscar() arma la URL con el estado de ESTE
  // render — recién el siguiente ve el cambio.
  const [pedidoBusqueda, setPedidoBusqueda] = useState(1);
  useEffect(() => {
    if (pedidoBusqueda) buscar(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pedidoBusqueda]);
  const rebuscar = () => setPedidoBusqueda((n) => n + 1);

  // El orden lo aplica el servidor a TODO el rango: al cambiarlo se vuelve
  // a pedir la página 1 (ordenar en memoria solo reordenaba la página visible).
  const ordenar = (campo: CampoOrden) => {
    ordenarBase(campo);
    rebuscar();
  };

  const chipsFiltros = chips(
    chipOpcion("Estado", OPCIONES_ESTADO.map((o) => ({ id: o.value, label: o.label })), estado, () => { setEstado(""); rebuscar(); }),
    esSupervisor && chipOpcion("Colaborador", opcionesColaborador, colaboradorId, () => { setColaboradorId(""); rebuscar(); })
  );

  const limpiarFiltros = () => {
    setEstado("");
    setColaboradorId("");
    rebuscar();
  };

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
      >
        <CampoFiltro etiqueta="Estado">
          <SelectorModerno opciones={OPCIONES_ESTADO} value={estado} onChange={setEstado} placeholder="Todos" />
        </CampoFiltro>
        {esSupervisor && (
          <CampoFiltro etiqueta="Colaborador">
            <ComboboxBuscable opciones={opcionesColaborador} value={colaboradorId} onChange={setColaboradorId} placeholder="Todos" />
          </CampoFiltro>
        )}
      </BarraFiltros>

      {error && <p className="text-sm text-red-600">{error}</p>}

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
                {items.map((s) => (
                  <tr key={s.id} className="border-t border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/60 transition">
                    <td className="px-4 py-3 font-mono font-semibold text-neutral-500 dark:text-neutral-400">{s.codigoNomina ?? "—"}</td>
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
                      <EstadoVacio mensaje="Sin resultados para ese rango" />
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
