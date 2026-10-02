// components/PanelHistorialTH.tsx
// Historial completo para Talento Humano: buscador (fechas, Empresa/Sitio/
// Área, estado, supervisor, colaborador), vista Lista o Por colaborador
// (igual que revisiones y pagos), total, paginación, Excel y constancia de
// pago. Pantalla propia (no modal), pensada para escritorio y móvil.

"use client";

import { useState, useEffect } from "react";
import { formatearMoneda } from "../lib/formato";
import { DESCRIPCION_ESTADO, ESTILOS_ESTADO } from "../lib/estadosSolicitud";
import SelectorModerno from "./SelectorModerno";
import Paginacion from "./Paginacion";
import TablaEsqueleto from "./TablaEsqueleto";
import EstadoVacio from "./EstadoVacio";
import Avatar from "./Avatar";
import EncabezadoOrdenable from "./EncabezadoOrdenable";
import { ModalMotivo } from "./ModalConfirmar";
import { useToast } from "./Toast";
import { formatearFecha } from "../lib/fechas";
import { useHistorialVistas } from "../lib/useHistorialVistas";
import { useBuscadorHistorial } from "../lib/useBuscadorHistorial";
import BuscadorHistorial, { Campo, AvisoSinBusqueda } from "./BuscadorHistorial";
import { chipOpcion } from "./BarraFiltros";
import { IconoImprimir, IconoDevolver, IconoDescargar } from "./Icons";
import SelectorVista from "./SelectorVista";
import TablaColaboradores from "./TablaColaboradores";

type Fila = {
  id: string;
  codigo: string;
  fecha: string;
  montoTotal: number;
  estado: string;
  rutaLabel: string;
  nombreColaborador: string;
  codigoNomina: string | null;
  aprobadoPor: string | null;
};

type CampoOrden = "fecha" | "nombreColaborador" | "rutaLabel" | "montoTotal" | "estado";

const OPCIONES_ESTADO = [
  { value: "", label: "Todos" },
  { value: "APROBADA", label: "Aprobada" },
  { value: "REVISADO", label: "Revisado" },
  { value: "PAGADA", label: "Pagada" },
];

// El Estado de la última búsqueda queda guardado EN ESTE NAVEGADOR y sale
// preseleccionado la próxima vez (solo el selector: igual hay que pulsar
// Buscar). No afecta a otros usuarios ni a otros equipos.
const CLAVE_ESTADO = "filtro:historial-th-estado";

function leerEstadoGuardado(): string {
  try {
    const guardado = window.localStorage.getItem(CLAVE_ESTADO) ?? "";
    return OPCIONES_ESTADO.some((o) => o.value === guardado) ? guardado : "";
  } catch {
    return "";
  }
}

function guardarEstado(estado: string) {
  try {
    if (estado) window.localStorage.setItem(CLAVE_ESTADO, estado);
    else window.localStorage.removeItem(CLAVE_ESTADO);
  } catch {
    // localStorage no disponible (privado/bloqueado): simplemente no se recuerda.
  }
}

export default function PanelHistorialTH() {
  // Filtros (fechas, Empresa/Sitio/Área, Supervisor, Colaborador): nada se
  // busca hasta pulsar Buscar — ver lib/useBuscadorHistorial.ts.
  const buscador = useBuscadorHistorial({ conSupervisor: true });
  const [estado, setEstado] = useState("");
  // Se lee tras montar (no en useState): el servidor no ve localStorage y
  // el selector no coincidiría al hidratar.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- valor guardado en el navegador
    setEstado(leerEstadoGuardado());
  }, []);

  const h = useHistorialVistas<Fila, CampoOrden>({
    aplicados: buscador.aplicados,
    api: "/api/th/historial",
    claveOrden: "historial-th",
    claveOrdenColaborador: "th-historial-colaborador",
  });
  const { items, totalMonto, totalRegistros, pagina, totalPaginas, cargando, error, buscar, ultimaRespuesta, orden, ordenar } = h.lista;
  const { vista, cambiarVista, urlExportar, puedeExportar, hayDatos, ocupado, rebuscar } = h;
  const colab = h.colaborador;
  const toast = useToast();

  const [idARevertir, setIdARevertir] = useState<string | null>(null);
  const [motivoRevertir, setMotivoRevertir] = useState("");
  const [revirtiendo, setRevirtiendo] = useState(false);
  const [errorRevertir, setErrorRevertir] = useState("");

  // Constancia: los MISMOS filtros de la última búsqueda, pero siempre solo
  // pagadas (sin importar el Estado) — la firma el colaborador al recibir
  // su pago. Solo se habilita si en esa búsqueda había pagadas.
  const pagadasImprimibles = Number(ultimaRespuesta?.pagadasImprimibles ?? 0);
  const urlImprimir = () => {
    const params = new URLSearchParams(buscador.aplicados ?? "");
    params.delete("estado");
    return `/th/historial/imprimir?${params.toString()}`;
  };

  // El conteo de pagadas viene de la búsqueda en Lista; en Por colaborador
  // se habilita si hay resultados (la constancia usa los mismos filtros).
  const puedeImprimir = !ocupado && (vista === "lista" ? pagadasImprimibles > 0 : !!buscador.aplicados && hayDatos);

  const buscarConFiltros = () => {
    guardarEstado(estado);
    if (buscador.aplicar({ estado })) rebuscar();
  };

  const abrirRevertir = (id: string) => {
    setIdARevertir(id);
    setMotivoRevertir("");
    setErrorRevertir("");
  };

  const confirmarRevertir = async () => {
    if (!idARevertir) return;
    if (motivoRevertir.trim().length < 3) {
      setErrorRevertir("Escribe el motivo de la corrección (mínimo 3 caracteres)");
      return;
    }
    setRevirtiendo(true);
    setErrorRevertir("");
    try {
      const res = await fetch(`/api/solicitudes/${idARevertir}/revertir`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ motivo: motivoRevertir }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErrorRevertir(data.error ?? "No se pudo revertir la solicitud");
        toast.error(data.error ?? "No se pudo revertir la solicitud");
        return;
      }
      setIdARevertir(null);
      toast.exito("Solicitud devuelta a Pendiente");
      buscar(pagina);
    } catch {
      setErrorRevertir("No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.");
      toast.error("No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setRevirtiendo(false);
    }
  };

  return (
    <div className="flex-1 px-4 sm:px-8 pb-5 space-y-4">
      <BuscadorHistorial
        buscador={buscador}
        onBuscar={buscarConFiltros}
        buscando={ocupado}
        extrasParams={{ estado }}
        extrasChips={[chipOpcion("Estado", OPCIONES_ESTADO.map((o) => ({ id: o.value, label: o.label })), estado, () => setEstado(""))]}
        onLimpiarExtras={() => setEstado("")}
        extras={
          <Campo etiqueta="Estado">
            <SelectorModerno opciones={OPCIONES_ESTADO} value={estado} onChange={setEstado} placeholder="Todos" />
          </Campo>
        }
        vista={<SelectorVista valor={vista} onCambiar={cambiarVista} desplegable />}
        exportar={[
          {
            etiqueta: "Excel",
            href: urlExportar(),
            icono: IconoDescargar,
            deshabilitado: !puedeExportar,
            detalle: puedeExportar ? "Todo lo de esta búsqueda" : "Busca primero: no hay resultados",
          },
          {
            etiqueta: "Imprimir constancia",
            href: urlImprimir(),
            icono: IconoImprimir,
            deshabilitado: !puedeImprimir,
            detalle: puedeImprimir ? "Solo las pagadas, para firmar" : "La búsqueda no tiene pagadas",
            nuevaPestana: true,
          },
        ]}
      />

      {!buscador.aplicados && !ocupado && <AvisoSinBusqueda faltante={buscador.faltante} />}

      {vista === "colaborador" && (
        <>
          {h.error && <p className="text-sm text-red-600">{h.error}</p>}
          {colab.cargando ? (
            <TablaEsqueleto columnas={3} />
          ) : colab.filas && (
            <div className="bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 rounded-2xl overflow-hidden shadow-sm ring-1 ring-black/5 dark:ring-white/10">
              <TablaColaboradores
                filas={colab.filas}
                cargarItems={colab.cargarItems}
                clave={(s) => s.id}
                ordenServidor={{ orden: colab.orden, ordenar: colab.ordenar }}
                columnas={[
                  { encabezado: "Código", render: (s) => <span className="font-mono">{s.codigoNomina ?? "—"}</span> },
                  { encabezado: "Fecha", render: (s) => formatearFecha(s.fecha) },
                  { encabezado: "Ruta", render: (s) => s.rutaLabel },
                  { encabezado: "Valor", render: (s) => formatearMoneda(s.montoTotal) },
                  { encabezado: "Aprobado por", render: (s) => s.aprobadoPor ?? "—" },
                  {
                    encabezado: "Estado",
                    render: (s) => (
                      <span title={DESCRIPCION_ESTADO[s.estado]} className={`text-[11px] px-2 py-0.5 rounded-full ${ESTILOS_ESTADO[s.estado]}`}>
                        {s.estado}
                      </span>
                    ),
                  },
                ]}
                vacio="Sin resultados para esos filtros"
              />
              <Paginacion paginaActual={colab.pagina} totalPaginas={colab.totalPaginas} onCambiarPagina={colab.buscar} deshabilitado={colab.cargando} />
            </div>
          )}
        </>
      )}

      {vista === "lista" && error && <p className="text-sm text-red-600">{error}</p>}

      {vista !== "lista" ? null : cargando ? (
        <TablaEsqueleto columnas={7} />
      ) : items && (
        <div className="bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 rounded-2xl overflow-hidden shadow-sm ring-1 ring-black/5 dark:ring-white/10">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Código</th>
                  <EncabezadoOrdenable campo="fecha" ordenActivo={orden} onOrdenar={ordenar}>Fecha</EncabezadoOrdenable>
                  <EncabezadoOrdenable campo="nombreColaborador" ordenActivo={orden} onOrdenar={ordenar}>Colaborador</EncabezadoOrdenable>
                  <EncabezadoOrdenable campo="rutaLabel" ordenActivo={orden} onOrdenar={ordenar}>Ruta</EncabezadoOrdenable>
                  <EncabezadoOrdenable campo="montoTotal" ordenActivo={orden} onOrdenar={ordenar}>Valor</EncabezadoOrdenable>
                  <th className="px-4 py-3 font-medium">Aprobado por</th>
                  <EncabezadoOrdenable campo="estado" ordenActivo={orden} onOrdenar={ordenar}>Estado</EncabezadoOrdenable>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((s, i) => (
                  <tr key={s.id} className="border-t border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/60 transition">
                    <td className="px-4 py-3 font-mono font-semibold text-neutral-500 dark:text-neutral-400">{s.codigoNomina ?? "—"}</td>
                    <td className="px-4 py-3">{formatearFecha(s.fecha)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar nombre={s.nombreColaborador} indice={i} className="w-7 h-7 text-[11px]" />
                        <span>{s.nombreColaborador}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-neutral-600 dark:text-neutral-400">{s.rutaLabel}</td>
                    <td className="px-4 py-3">{formatearMoneda(s.montoTotal)}</td>
                    <td className="px-4 py-3 text-neutral-600 dark:text-neutral-400">{s.aprobadoPor ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span title={DESCRIPCION_ESTADO[s.estado]} className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${ESTILOS_ESTADO[s.estado]}`}>
                        {s.estado}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {s.estado === "APROBADA" && (
                        <button
                          onClick={() => abrirRevertir(s.id)}
                          title="Revertir a pendiente"
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-500 dark:text-neutral-400 border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-700 dark:hover:text-neutral-200 px-2.5 py-1.5 rounded-lg transition"
                        >
                          <IconoDevolver className="w-3.5 h-3.5" /> Revertir
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-10">
                      <EstadoVacio mensaje="Sin resultados para ese rango" />
                    </td>
                  </tr>
                )}
              </tbody>
              {items.length > 0 && (
                <tfoot>
                  <tr className="border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/60 font-semibold">
                    <td className="px-4 py-3" colSpan={4}>
                      Total solicitudes <span className="font-normal text-neutral-500 dark:text-neutral-400">({totalRegistros} solicitud{totalRegistros === 1 ? "" : "es"})</span>
                    </td>
                    <td className="px-4 py-3" colSpan={4}>{formatearMoneda(totalMonto)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
          <Paginacion paginaActual={pagina} totalPaginas={totalPaginas} onCambiarPagina={buscar} deshabilitado={cargando} />
        </div>
      )}

      <ModalMotivo
        abierto={!!idARevertir}
        onCerrar={() => setIdARevertir(null)}
        onConfirmar={confirmarRevertir}
        procesando={revirtiendo}
        error={errorRevertir}
        titulo="Revertir a Pendiente"
        descripcion="La solicitud vuelve a la cola de aprobación. Úsalo solo para corregir un error de control."
        motivo={motivoRevertir}
        onCambiarMotivo={setMotivoRevertir}
        placeholder="Ej: Se aprobó por error, ruta incorrecta..."
        textoConfirmar="Revertir"
        textoProcesando="Guardando..."
      />
    </div>
  );
}