// components/PanelHistorialTH.tsx
// Historial completo para Talento Humano: filtros por fecha, estado y
// colaborador, con total y paginación. Pantalla propia (no modal),
// pensada para escritorio y móvil por igual.

"use client";

import { useState, useEffect } from "react";
import { formatearMoneda } from "../lib/formato";
import { DESCRIPCION_ESTADO, ESTILOS_ESTADO } from "../lib/estadosSolicitud";
import RangoFechasSelector from "./RangoFechasSelector";
import SelectorModerno from "./SelectorModerno";
import ComboboxBuscable from "./ComboboxBuscable";
import Paginacion from "./Paginacion";
import TablaEsqueleto from "./TablaEsqueleto";
import EstadoVacio from "./EstadoVacio";
import Avatar from "./Avatar";
import EncabezadoOrdenable from "./EncabezadoOrdenable";
import Modal from "./Modal";
import Spinner from "./Spinner";
import { useToast } from "./Toast";
import { formatearFecha, fechaHoyTexto } from "../lib/fechas";
import { useOrdenTabla } from "../lib/useOrdenTabla";
import { useHistorialLista } from "../lib/useHistorialLista";
import { IconoImprimir, IconoDevolver, IconoDescargar } from "./Icons";
import BarraFiltros, { CampoFiltro, chipOpcion, chips } from "./BarraFiltros";

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
const VALOR_ORDEN: Record<CampoOrden, (f: Fila) => string | number> = {
  fecha: (f) => f.fecha,
  nombreColaborador: (f) => f.nombreColaborador,
  rutaLabel: (f) => f.rutaLabel,
  montoTotal: (f) => f.montoTotal,
  estado: (f) => f.estado,
};

// Sentinel para el filtro "Sin supervisor (solicita directo)" — no es un
// id real de colaborador, así que no puede chocar con uno.
const SIN_SUPERVISOR = "__sin_supervisor__";

const OPCIONES_ESTADO = [
  { value: "", label: "Todos" },
  { value: "APROBADA", label: "Aprobada" },
  { value: "PAGADA", label: "Pagada" },
];

export default function PanelHistorialTH() {
  const [desde, setDesde] = useState(fechaHoyTexto);
  const [hasta, setHasta] = useState(fechaHoyTexto);
  const [estado, setEstado] = useState("");
  const [supervisorId, setSupervisorId] = useState("");
  const [colaboradorId, setColaboradorId] = useState("");

  // "Sin áreas asignadas" se resuelve en el cliente (mismo chequeo que ya
  // hace el backend al armar el combo de colaboradores, vía el 403 de esa
  // misma consulta) para que la pantalla se muestre de inmediato en vez
  // de esperar esa consulta antes de mostrar nada — el caso normal (sí
  // tiene áreas) no debería pagar el costo del caso raro (no tiene).
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
    fetch(`/api/th/historial/supervisores-filtro?${params.toString()}`)
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
  // rango/estado/supervisor elegidos, no la lista completa de la empresa
  // (que puede ser grande y no tiene relación con lo que se está por
  // buscar).
  const [colaboradores, setColaboradores] = useState<{ id: string; nombreCompleto: string }[]>([]);
  useEffect(() => {
    if (!desde || !hasta) return;
    const params = new URLSearchParams({ desde, hasta });
    if (estado) params.set("estado", estado);
    if (supervisorId) params.set("supervisorId", supervisorId);
    let cancelado = false;
    fetch(`/api/th/historial/colaboradores-filtro?${params.toString()}`)
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
  const { items, totalMonto, totalRegistros, pagina, totalPaginas, cargando, error, buscar, ultimaUrl, ultimaRespuesta } = useHistorialLista<Fila>(
    (paginaNueva) => {
      if (!desde || !hasta) return null;
      const params = new URLSearchParams({ desde, hasta, pagina: String(paginaNueva) });
      if (estado) params.set("estado", estado);
      if (supervisorId) params.set("supervisorId", supervisorId);
      if (colaboradorId) params.set("colaboradorId", colaboradorId);
      return `/api/th/historial?${params.toString()}`;
    }
  );
  const toast = useToast();

  const [idARevertir, setIdARevertir] = useState<string | null>(null);
  const [motivoRevertir, setMotivoRevertir] = useState("");
  const [revirtiendo, setRevirtiendo] = useState(false);
  const [errorRevertir, setErrorRevertir] = useState("");

  const { orden, ordenar, itemsOrdenados } = useOrdenTabla<Fila, CampoOrden>(
    items ?? [],
    (f, campo) => VALOR_ORDEN[campo](f),
    "historial-th"
  );

  const opcionesColaborador = [
    { id: "", label: "Todos" },
    ...colaboradores.map((c) => ({ id: c.id, label: c.nombreCompleto })),
  ];

  // Siempre solo Pagadas (sin importar el filtro de Estado en pantalla):
  // es la constancia que firma el colaborador al recibir su pago. Usa el
  // rango/colaborador de la ÚLTIMA búsqueda, y solo se habilita si en
  // ella había pagadas para imprimir (la API las cuenta aparte).
  const pagadasImprimibles = Number(ultimaRespuesta?.pagadasImprimibles ?? 0);
  const urlImprimir = () => {
    const buscado = new URLSearchParams(ultimaUrl?.split("?")[1] ?? "");
    const params = new URLSearchParams({ desde: buscado.get("desde") ?? "", hasta: buscado.get("hasta") ?? "" });
    const colaborador = buscado.get("colaboradorId");
    if (colaborador) params.set("colaboradorId", colaborador);
    return `/th/historial/imprimir?${params.toString()}`;
  };

  // Exporta con los filtros de la ÚLTIMA búsqueda (sin paginar), y solo se
  // habilita si esa búsqueda trajo resultados — evita un Excel vacío.
  const urlExportar = () => {
    const params = new URLSearchParams(ultimaUrl?.split("?")[1] ?? "");
    params.delete("pagina");
    return `/api/th/historial/exportar?${params.toString()}`;
  };
  const puedeExportar = !cargando && !sinAsignaciones && !!ultimaUrl && totalRegistros > 0;

  const cambiarSupervisor = (v: string) => {
    setSupervisorId(v);
    setColaboradorId("");
  };

  // Busca sola al entrar, al cambiar el rango de fechas y al quitar un
  // chip (o "Limpiar filtros"), igual que Aprobaciones — solo Estado,
  // Supervisor y Colaborador se eligen en el panel y se aplican juntos.
  // Va en un efecto porque buscar() arma la URL con el estado de ESTE
  // render — recién en el siguiente ya ve el filtro cambiado.
  const [pedidoBusqueda, setPedidoBusqueda] = useState(1);
  useEffect(() => {
    if (pedidoBusqueda) buscar(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pedidoBusqueda]);
  const rebuscar = () => setPedidoBusqueda((n) => n + 1);

  const chipsFiltros = chips(
    chipOpcion("Estado", OPCIONES_ESTADO.map((o) => ({ id: o.value, label: o.label })), estado, () => { setEstado(""); rebuscar(); }),
    chipOpcion("Supervisor", supervisoresOpciones, supervisorId, () => { cambiarSupervisor(""); rebuscar(); }),
    chipOpcion("Colaborador", opcionesColaborador, colaboradorId, () => { setColaboradorId(""); rebuscar(); })
  );

  const limpiarFiltros = () => {
    setEstado("");
    setSupervisorId("");
    setColaboradorId("");
    rebuscar();
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

      {sinAsignaciones && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-xl px-4 py-3">
          No tienes ninguna Empresa/Sitio/Área asignada todavía.
        </div>
      )}

      <BarraFiltros
        chips={chipsFiltros}
        onLimpiar={limpiarFiltros}
        onAplicar={() => buscar(1)}
        aplicando={cargando}
        aplicarDeshabilitado={sinAsignaciones}
        textoAplicar="Aplicar"
        destacado={
          <RangoFechasSelector desde={desde} hasta={hasta} onChange={(d, h) => { setDesde(d); setHasta(h); rebuscar(); }} />
        }
        acciones={
          <>
            {cargando || sinAsignaciones || pagadasImprimibles === 0 ? (
              <span
                title={sinAsignaciones ? "Sin áreas asignadas" : cargando ? "Buscando..." : "No hay solicitudes pagadas en este rango"}
                className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-neutral-300 dark:text-neutral-700 border border-neutral-200 dark:border-neutral-800 px-3.5 py-2.5 rounded-xl cursor-not-allowed"
              >
                <IconoImprimir className="w-4 h-4" /> Imprimir pagadas
              </span>
            ) : (
              <a
                href={urlImprimir()}
                target="_blank"
                rel="noopener noreferrer"
                title={`Imprime ${pagadasImprimibles} ${pagadasImprimibles === 1 ? "solicitud pagada" : "solicitudes pagadas"} del rango, sin importar el filtro de Estado`}
                className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-neutral-700 dark:text-neutral-300 border border-neutral-300 hover:border-orange-400 hover:text-orange-600 px-3.5 py-2.5 rounded-xl transition"
              >
                <IconoImprimir className="w-4 h-4" /> Imprimir pagadas
              </a>
            )}
            {puedeExportar ? (
              <a
                href={urlExportar()}
                className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-neutral-700 dark:text-neutral-300 border border-neutral-300 hover:border-orange-400 hover:text-orange-600 px-3.5 py-2.5 rounded-xl transition"
              >
                <IconoDescargar className="w-4 h-4" /> Exportar a Excel
              </a>
            ) : (
              <span
                title={sinAsignaciones ? "Sin áreas asignadas" : cargando ? "Buscando..." : "Busca primero: no hay resultados para exportar"}
                className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-neutral-300 dark:text-neutral-700 border border-neutral-200 dark:border-neutral-800 px-3.5 py-2.5 rounded-xl cursor-not-allowed"
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
        <CampoFiltro etiqueta="Supervisor">
          <ComboboxBuscable
            opciones={[{ id: "", label: "Todos" }, ...supervisoresOpciones]}
            value={supervisorId}
            onChange={cambiarSupervisor}
            placeholder="Todos"
          />
        </CampoFiltro>
        <CampoFiltro etiqueta="Colaborador">
          <ComboboxBuscable opciones={opcionesColaborador} value={colaboradorId} onChange={setColaboradorId} placeholder="Todos" />
        </CampoFiltro>
      </BarraFiltros>

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
                {itemsOrdenados.map((s, i) => (
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
            La solicitud vuelve a la cola de aprobación. Usalo solo para corregir un error de control.
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