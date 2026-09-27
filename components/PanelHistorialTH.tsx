// components/PanelHistorialTH.tsx
// Historial completo para Talento Humano: buscador (fechas, Empresa/Sitio/
// Área, estado, supervisor, colaborador), total, paginación, Excel y
// constancia de pago. Pantalla propia (no modal),
// pensada para escritorio y móvil por igual.

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
import Modal from "./Modal";
import Spinner from "./Spinner";
import { useToast } from "./Toast";
import { formatearFecha } from "../lib/fechas";
import { useOrdenServidor, agregarOrdenAParams } from "../lib/useOrdenTabla";
import { useHistorialLista } from "../lib/useHistorialLista";
import { useBuscadorHistorial } from "../lib/useBuscadorHistorial";
import BuscadorHistorial, { Campo, AvisoSinBusqueda } from "./BuscadorHistorial";
import { chipOpcion } from "./BarraFiltros";
import { IconoImprimir, IconoDevolver, IconoDescargar } from "./Icons";

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
  { value: "PAGADA", label: "Pagada" },
];

const CLASE_ACCION =
  "inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-neutral-700 dark:text-neutral-300 border border-neutral-300 hover:border-orange-400 hover:text-orange-600 px-3 py-2 rounded-xl transition";
const CLASE_ACCION_OFF =
  "inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-neutral-300 dark:text-neutral-700 border border-neutral-200 dark:border-neutral-800 px-3 py-2 rounded-xl cursor-not-allowed";

export default function PanelHistorialTH() {
  // Filtros (fechas, Empresa/Sitio/Área, Supervisor, Colaborador): nada se
  // busca hasta pulsar Buscar — ver lib/useBuscadorHistorial.ts.
  const buscador = useBuscadorHistorial({ conSupervisor: true });
  const [estado, setEstado] = useState("");

  const { orden, ordenar: ordenarBase } = useOrdenServidor<CampoOrden>("historial-th");
  const { items, totalMonto, totalRegistros, pagina, totalPaginas, cargando, error, buscar, ultimaUrl, ultimaRespuesta } = useHistorialLista<Fila>(
    (paginaNueva) => {
      // Siempre con la foto de la última búsqueda (no lo que se está
      // cambiando en pantalla).
      if (!buscador.aplicados) return null;
      const params = new URLSearchParams(buscador.aplicados);
      params.set("pagina", String(paginaNueva));
      agregarOrdenAParams(params, orden);
      return `/api/th/historial?${params.toString()}`;
    }
  );
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

  // Exporta con los filtros de la ÚLTIMA búsqueda (sin paginar), y solo se
  // habilita si esa búsqueda trajo resultados — evita un Excel vacío.
  const urlExportar = () => {
    const params = new URLSearchParams(ultimaUrl?.split("?")[1] ?? "");
    params.delete("pagina");
    return `/api/th/historial/exportar?${params.toString()}`;
  };
  const puedeExportar = !cargando && !!ultimaUrl && totalRegistros > 0;
  const puedeImprimir = !cargando && pagadasImprimibles > 0;

  // buscar() arma la URL con el estado de ESTE render: tras aplicar los
  // filtros (o cambiar el orden), la consulta sale en el render siguiente.
  const [pedidoBusqueda, setPedidoBusqueda] = useState(0);
  useEffect(() => {
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
    ordenarBase(campo);
    if (buscador.aplicados) rebuscar();
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
        buscando={cargando}
        extrasParams={{ estado }}
        extrasChips={[chipOpcion("Estado", OPCIONES_ESTADO.map((o) => ({ id: o.value, label: o.label })), estado, () => setEstado(""))]}
        onLimpiarExtras={() => setEstado("")}
        extras={
          <Campo etiqueta="Estado">
            <SelectorModerno opciones={OPCIONES_ESTADO} value={estado} onChange={setEstado} placeholder="Todos" />
          </Campo>
        }
        acciones={
          <>
            {puedeImprimir ? (
              <a
                href={urlImprimir()}
                target="_blank"
                rel="noopener noreferrer"
                title={`Imprime la constancia de ${pagadasImprimibles} ${pagadasImprimibles === 1 ? "solicitud pagada" : "solicitudes pagadas"} de esta búsqueda`}
                className={CLASE_ACCION}
              >
                <IconoImprimir className="w-4 h-4" /> Imprimir pagadas
              </a>
            ) : (
              <span title={cargando ? "Buscando..." : "La búsqueda no tiene solicitudes pagadas"} className={CLASE_ACCION_OFF}>
                <IconoImprimir className="w-4 h-4" /> Imprimir pagadas
              </span>
            )}
            {puedeExportar ? (
              <a href={urlExportar()} className={CLASE_ACCION}>
                <IconoDescargar className="w-4 h-4" /> Exportar a Excel
              </a>
            ) : (
              <span title={cargando ? "Buscando..." : "Busca primero: no hay resultados para exportar"} className={CLASE_ACCION_OFF}>
                <IconoDescargar className="w-4 h-4" /> Exportar a Excel
              </span>
            )}
          </>
        }
      />

      {!buscador.aplicados && !cargando && <AvisoSinBusqueda faltante={buscador.faltante} />}

      {error && <p className="text-sm text-red-600">{error}</p>}

      {cargando ? (
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
                    <td className="px-4 py-3 text-neutral-600">{s.rutaLabel}</td>
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
                      Total del rango <span className="font-normal text-neutral-500 dark:text-neutral-400">({totalRegistros} solicitud{totalRegistros === 1 ? "" : "es"})</span>
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

      <Modal abierto={!!idARevertir} onCerrar={() => setIdARevertir(null)} onConfirmar={confirmarRevertir} className="bg-white dark:bg-neutral-900 text-black dark:text-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-sm p-7 space-y-4 shadow-2xl">
        <div>
          <h2 className="font-semibold text-neutral-900 dark:text-white">Revertir a Pendiente</h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            La solicitud vuelve a la cola de aprobación. Úsalo solo para corregir un error de control.
          </p>
        </div>
        <textarea
          value={motivoRevertir}
          onChange={(e) => setMotivoRevertir(e.target.value.toUpperCase())}
          rows={3}
          autoFocus
          className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white px-3.5 py-3 text-sm focus:border-orange-400 focus:ring-2 focus:ring-orange-500/15 outline-none resize-none"
          placeholder="Ej: Se aprobó por error, ruta incorrecta..."
        />
        {errorRevertir && <p className="text-sm text-red-600">{errorRevertir}</p>}
        <div className="flex gap-2 justify-end pt-1">
          <button
            onClick={() => setIdARevertir(null)}
            disabled={revirtiendo}
            className="px-4 py-2.5 text-sm font-medium text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition"
          >
            Cancelar
          </button>
          <button
            onClick={confirmarRevertir}
            disabled={revirtiendo}
            className="px-5 py-2.5 text-sm font-semibold bg-neutral-800 hover:bg-neutral-900 text-white rounded-xl disabled:opacity-50 transition flex items-center justify-center gap-2"
          >
            {revirtiendo && <Spinner className="w-4 h-4" />}
            {revirtiendo ? "Guardando..." : "Revertir"}
          </button>
        </div>
      </Modal>
    </div>
  );
}