// components/PanelHistorialNomina.tsx
// Historial de PAGADAS (antes "Historial de Finanzas"): buscador con rango
// de fechas + Empresa/Sitio -> Área -> Colaborador, vista alterna agrupada
// por colaborador, y exportación a Excel. La lógica de búsqueda/vistas es
// la común de lib/useHistorialVistas.ts.

"use client";

import { formatearMoneda } from "../lib/formato";
import { useBuscadorHistorial } from "../lib/useBuscadorHistorial";
import { useHistorialVistas } from "../lib/useHistorialVistas";
import BuscadorHistorial, { AvisoSinBusqueda } from "./BuscadorHistorial";
import Paginacion from "./Paginacion";
import TablaEsqueleto from "./TablaEsqueleto";
import EstadoVacio from "./EstadoVacio";
import SelectorVista from "./SelectorVista";
import EncabezadoOrdenable from "./EncabezadoOrdenable";
import { formatearFecha, formatearFechaEcuador } from "../lib/fechas";
import TablaColaboradores from "./TablaColaboradores";
import { IconoDescargar } from "./Icons";

type Fila = { id: string; codigo: string; fecha: string; fechaPago: string | null; montoTotal: number; nombreColaborador: string; codigoNomina: string | null; pagadoPor: string | null; rutaLabel: string };

type CampoOrden = "fecha" | "nombreColaborador" | "rutaLabel" | "montoTotal";

export default function PanelHistorialNomina() {
  const buscador = useBuscadorHistorial({ conSupervisor: false });
  const h = useHistorialVistas<Fila, CampoOrden>({
    aplicados: buscador.aplicados,
    api: "/api/nomina/historial",
    claveOrden: "historial-nomina",
    claveOrdenColaborador: "nomina-historial-colaborador",
  });
  const { items, totalMonto, pagina, totalPaginas, orden, ordenar, buscar } = h.lista;
  const { vista, cambiarVista, urlExportar, puedeExportar, error } = h;
  const cargando = h.ocupado;
  const colab = h.colaborador;

  const buscarConFiltros = () => {
    if (buscador.aplicar()) h.rebuscar();
  };

  return (
    <div className="flex-1 px-4 sm:px-8 pb-5 space-y-4">
      <BuscadorHistorial
        buscador={buscador}
        onBuscar={buscarConFiltros}
        buscando={cargando}
        vista={<SelectorVista valor={vista} onCambiar={cambiarVista} desplegable />}
        exportar={[
          {
            etiqueta: "Excel",
            href: urlExportar(),
            icono: IconoDescargar,
            deshabilitado: !puedeExportar,
            detalle: puedeExportar ? "Todo lo de esta búsqueda" : "Busca primero: no hay resultados",
          },
        ]}
      />

      {!buscador.aplicados && !cargando && <AvisoSinBusqueda faltante={buscador.faltante} />}

      {error && <p className="text-sm text-red-600">{error}</p>}

      {cargando && <TablaEsqueleto columnas={vista === "lista" ? 6 : 3} />}

      {!cargando && vista === "colaborador" && colab.filas && (
        <div className="bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 rounded-2xl overflow-hidden shadow-sm ring-1 ring-black/5 dark:ring-white/10">
          <TablaColaboradores
            filas={colab.filas}
            cargarItems={colab.cargarItems}
            clave={(s) => s.id}
            ordenServidor={{ orden: colab.orden, ordenar: colab.ordenar }}
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
          <Paginacion paginaActual={colab.pagina} totalPaginas={colab.totalPaginas} onCambiarPagina={colab.buscar} deshabilitado={cargando} />
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
                    <td className="px-4 py-3 text-neutral-600 dark:text-neutral-400">{s.rutaLabel}</td>
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
                    <td className="px-4 py-3" colSpan={4}>Total solicitudes</td>
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
