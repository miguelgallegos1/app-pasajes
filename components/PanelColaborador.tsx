// components/PanelColaborador.tsx
// Panel del colaborador/supervisor: buscador, tabla con observaciones
// visibles, Editar/Eliminar mientras esté Pendiente o Rechazada, historial
// de pagos, y confirmaciones con diseño propio.

"use client";

import { useState, useMemo, useRef } from "react";
import { formatearMoneda } from "../lib/formato";
import { DESCRIPCION_ESTADO } from "../lib/estadosSolicitud";
import { useRouter } from "next/navigation";
import CalendarioSelector from "./CalendarioSelector";
import ComboboxBuscable from "./ComboboxBuscable";
import Modal from "./Modal";
import Paginacion from "./Paginacion";
import { formatearFecha, fechaHoyTexto } from "../lib/fechas";
import Spinner from "./Spinner";
import { useToast } from "./Toast";
import EstadoVacio from "./EstadoVacio";
import { IconoPregunta, IconoLupa } from "./Icons";

type Solicitud = {
  id: string;
  codigo: string;
  colaboradorId: string;
  rutaId: string;
  fecha: string;
  fechaSolicitud: string;
  montoTotal: number;
  estado: string;
  observaciones: string | null;
  rutaLabel: string;
  nombreColaborador: string;
};

type RutaSimple = { id: string; valor: number; label: string };
type MiembroEquipo = { id: string; nombreCompleto: string };

const ESTILOS_ESTADO: Record<string, string> = {
  PENDIENTE: "bg-amber-100 text-amber-800",
  APROBADA: "bg-green-100 text-green-800",
  RECHAZADA: "bg-red-100 text-red-800",
  REVISADO: "bg-sky-100 text-sky-800",
  PAGADA: "bg-orange-100 text-orange-800",
};

const CLASE_CAMPO =
  "mt-1.5 w-full rounded-xl border border-neutral-200 px-3.5 py-3 text-sm text-neutral-900 dark:text-white " +
  "transition hover:border-neutral-300 focus:border-orange-400 focus:ring-2 focus:ring-orange-500/15 outline-none";

const POR_PAGINA = 8;

export default function PanelColaborador({
  colaboradorId,
  nombreCompleto,
  esSupervisor,
  equipo,
  rutasPropias,
  solicitudes,
}: {
  colaboradorId: string;
  nombreCompleto: string;
  esSupervisor: boolean;
  equipo: MiembroEquipo[];
  rutasPropias: RutaSimple[];
  solicitudes: Solicitud[];
}) {
  const router = useRouter();
  const toast = useToast();

  const [busqueda, setBusqueda] = useState("");
  const [paginaActual, setPaginaActual] = useState(1);

  // Al eliminar, la fila se oculta al instante (con opción de deshacer)
  // sin tocar el array que vino del servidor — así "Crear"/"Editar" siguen
  // funcionando con su router.refresh() de siempre, sin pisarse con esto.
  const [idsOcultos, setIdsOcultos] = useState<Set<string>>(new Set());
  const solicitudesVisibles = useMemo(
    () => (idsOcultos.size === 0 ? solicitudes : solicitudes.filter((s) => !idsOcultos.has(s.id))),
    [solicitudes, idsOcultos]
  );

  const solicitudesFiltradas = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    if (!texto) return solicitudesVisibles;
    return solicitudesVisibles.filter(
      (s) =>
        s.codigo.toLowerCase().includes(texto) ||
        s.rutaLabel.toLowerCase().includes(texto) ||
        s.nombreColaborador.toLowerCase().includes(texto) ||
        (s.observaciones ?? "").toLowerCase().includes(texto)
    );
  }, [solicitudesVisibles, busqueda]);

  const cambiarBusqueda = (v: string) => {
    setBusqueda(v);
    setPaginaActual(1);
  };

  const [modalAbierto, setModalAbierto] = useState(false);
  const [modoEdicionId, setModoEdicionId] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");


  const [colaboradorSeleccionado, setColaboradorSeleccionado] = useState(colaboradorId);
  const [fecha, setFecha] = useState("");
  const [rutaId, setRutaId] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [rutasDisponibles, setRutasDisponibles] = useState<RutaSimple[]>(rutasPropias);
  const [cargandoRutas, setCargandoRutas] = useState(false);

  const totalPaginas = Math.max(1, Math.ceil(solicitudesFiltradas.length / POR_PAGINA));
  const solicitudesPagina = useMemo(
    () => solicitudesFiltradas.slice((paginaActual - 1) * POR_PAGINA, paginaActual * POR_PAGINA),
    [solicitudesFiltradas, paginaActual]
  );
  const totalGeneral = useMemo(
    () => solicitudesFiltradas.reduce((acc, s) => acc + s.montoTotal, 0),
    [solicitudesFiltradas]
  );

  const opcionesColaborador = useMemo(
    () => [
      { id: colaboradorId, label: `${nombreCompleto} (yo)` },
      ...equipo.map((c) => ({ id: c.id, label: c.nombreCompleto })),
    ],
    [colaboradorId, nombreCompleto, equipo]
  );

  const opcionesRutas = useMemo(
    () => rutasDisponibles.map((r) => ({ id: r.id, label: `${r.label} — ${formatearMoneda(r.valor)}` })),
    [rutasDisponibles]
  );

  const valorSeleccionado = useMemo(
    () => rutasDisponibles.find((r) => r.id === rutaId)?.valor ?? null,
    [rutaId, rutasDisponibles]
  );

  const fechaMinima = useMemo(() => {
    const limite = new Date();
    limite.setDate(limite.getDate() - 2);
    const y = limite.getFullYear();
    const m = String(limite.getMonth() + 1).padStart(2, "0");
    const d = String(limite.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, []);

  const peticionRutasIdRef = useRef(0);

  const cargarRutasDe = async (idColaborador: string) => {
    if (idColaborador === colaboradorId) {
      setRutasDisponibles(rutasPropias);
      return;
    }
    const idPeticion = ++peticionRutasIdRef.current;
    setCargandoRutas(true);
    try {
      const res = await fetch(`/api/rutas?colaboradorId=${idColaborador}`);
      if (idPeticion !== peticionRutasIdRef.current) return;
      if (res.ok) setRutasDisponibles(await res.json());
    } catch {
      if (idPeticion === peticionRutasIdRef.current) {
        toast.error("No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.");
      }
    } finally {
      if (idPeticion === peticionRutasIdRef.current) setCargandoRutas(false);
    }
  };

  const cambiarColaborador = async (nuevoId: string) => {
    setColaboradorSeleccionado(nuevoId);
    setRutaId("");
    await cargarRutasDe(nuevoId);
  };

  const abrirModal = () => {
    setModoEdicionId(null);
    setModalAbierto(true);
    setColaboradorSeleccionado(colaboradorId);
    setRutasDisponibles(rutasPropias);
    setFecha(fechaHoyTexto());
    setRutaId("");
    setObservaciones("");
    setError("");
  };

  const abrirEdicion = async (s: Solicitud) => {
    setModoEdicionId(s.id);
    setColaboradorSeleccionado(s.colaboradorId);
    setFecha(s.fecha.split("T")[0]);
    setObservaciones(s.observaciones ?? "");
    setError("");
    await cargarRutasDe(s.colaboradorId);
    setRutaId(s.rutaId);
    setModalAbierto(true);
  };

  const confirmarRegistro = async () => {
    setEnviando(true);
    setError("");

    const url = modoEdicionId ? `/api/solicitudes/${modoEdicionId}` : "/api/solicitudes";
    const method = modoEdicionId ? "PATCH" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ colaboradorId: colaboradorSeleccionado, rutaId, fecha, observaciones }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "No se pudo guardar la solicitud");
        toast.error(data.error ?? "No se pudo guardar la solicitud");
        setConfirmando(false);
        return;
      }
      setConfirmando(false);
      setModalAbierto(false);
      setModoEdicionId(null);
      toast.exito(modoEdicionId ? "Solicitud actualizada" : "Solicitud registrada");
      router.refresh();
    } catch {
      setError("No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.");
      toast.error("No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.");
      setConfirmando(false);
    } finally {
      setEnviando(false);
    }
  };

  // Optimista con deshacer: la fila se oculta al toque; el DELETE real
  // recién se manda si nadie tocó "Deshacer" en el toast.
  const ocultar = (id: string) => setIdsOcultos((prev) => new Set(prev).add(id));
  const mostrar = (id: string) =>
    setIdsOcultos((prev) => {
      const copia = new Set(prev);
      copia.delete(id);
      return copia;
    });

  const eliminarConDeshacer = (s: Solicitud) => {
    ocultar(s.id);
    toast.deshacer(
      "Solicitud eliminada",
      () => mostrar(s.id),
      async () => {
        try {
          const res = await fetch(`/api/solicitudes/${s.id}`, { method: "DELETE" });
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            toast.error(data.error ?? "No se pudo eliminar la solicitud");
            mostrar(s.id);
            return;
          }
          router.refresh();
        } catch {
          toast.error("No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.");
          mostrar(s.id);
        }
      }
    );
  };

  return (
    <div className="flex flex-col">
      <div className="flex-1 px-4 sm:px-8 py-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex flex-wrap items-baseline gap-2">
            <h1 className="text-lg sm:text-xl font-bold">Mis Pasajes</h1>
            <span className="hidden sm:inline text-xs text-neutral-500 dark:text-neutral-400">· Registra y da seguimiento a tus solicitudes de pasajes</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={abrirModal}
              className="text-xs sm:text-sm font-semibold bg-orange-500 hover:bg-orange-600 text-black px-3 py-2 rounded-lg transition shadow-sm hover:shadow-md hover:-translate-y-0.5"
            >
              + Nueva solicitud
            </button>
          </div>
        </div>

        <div className="relative max-w-sm">
          <IconoLupa className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 dark:text-neutral-500 pointer-events-none" />
          <input
            value={busqueda}
            onChange={(e) => cambiarBusqueda(e.target.value)}
            placeholder="Buscar por código, ruta, colaborador u observación..."
            className="w-full rounded-xl border border-neutral-300 bg-white text-neutral-900 pl-10 pr-4 py-2.5 text-sm placeholder-neutral-500 focus:border-orange-400 focus:ring-2 focus:ring-orange-500/15 outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
          />
        </div>

        <div className="bg-neutral-50 dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 rounded-2xl overflow-hidden shadow-sm ring-1 ring-black/5 dark:ring-white/10">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[760px]">
              <thead className="bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Código</th>
                  <th className="px-4 py-3 font-medium">Fecha</th>
                  {esSupervisor && <th className="px-4 py-3 font-medium">Colaborador</th>}
                  <th className="px-4 py-3 font-medium">Ruta</th>
                  <th className="px-4 py-3 font-medium">Valor</th>
                  <th className="px-4 py-3 font-medium">Observaciones</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {solicitudesPagina.map((s) => (
                  <tr key={s.id} className="border-t border-neutral-200/70 dark:border-neutral-800/70 hover:bg-neutral-100/60 dark:hover:bg-neutral-800/60 transition">
                    <td className="px-4 py-3 font-mono font-bold tracking-widest text-neutral-500 dark:text-neutral-400">{s.codigo}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{formatearFecha(s.fecha)}</p>
                      <p className="text-[11px] text-neutral-400 dark:text-neutral-500">
                        Registrado: {new Date(s.fechaSolicitud).toLocaleString("es-EC", {
                          day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
                        })}
                      </p>
                    </td>
                    {esSupervisor && (
                      <td className="px-4 py-3">
                        {s.nombreColaborador}
                        {s.nombreColaborador === nombreCompleto && (
                          <span className="text-[10px] text-neutral-400 dark:text-neutral-500 ml-1">(yo)</span>
                        )}
                      </td>
                    )}
                    <td className="px-4 py-3">{s.rutaLabel}</td>
                    <td className="px-4 py-3">{formatearMoneda(s.montoTotal)}</td>
                    <td className="px-4 py-3 text-neutral-500 dark:text-neutral-400 max-w-[180px] truncate" title={s.observaciones ?? ""}>
                      {s.observaciones || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span title={DESCRIPCION_ESTADO[s.estado]} className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${ESTILOS_ESTADO[s.estado]}`}>
                        {s.estado}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {(s.estado === "PENDIENTE" || s.estado === "RECHAZADA") && (
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => abrirEdicion(s)}
                            className="text-xs font-medium text-white bg-neutral-700 hover:bg-neutral-800 px-3 py-1.5 rounded-full transition"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => eliminarConDeshacer(s)}
                            className="text-xs font-medium text-white bg-red-500 hover:bg-red-600 px-3 py-1.5 rounded-full transition"
                          >
                            Eliminar
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {solicitudesFiltradas.length === 0 && (
                  <tr>
                    <td colSpan={esSupervisor ? 8 : 7} className="px-4 py-10">
                      <EstadoVacio mensaje={busqueda ? "Sin resultados para esa búsqueda" : "Aún no hay solicitudes registradas"} />
                    </td>
                  </tr>
                )}
              </tbody>

              {solicitudesFiltradas.length > 0 && (
                <tfoot>
                  <tr className="border-t border-neutral-200 dark:border-neutral-800 bg-neutral-100/70 dark:bg-neutral-800/60 font-semibold">
                    <td className="px-4 py-3" colSpan={esSupervisor ? 4 : 3}>
                      Total ({solicitudesFiltradas.length} {solicitudesFiltradas.length === 1 ? "solicitud" : "solicitudes"})
                    </td>
                    <td className="px-4 py-3">{formatearMoneda(totalGeneral)}</td>
                    <td colSpan={3}></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          <Paginacion paginaActual={paginaActual} totalPaginas={totalPaginas} onCambiarPagina={setPaginaActual} />
        </div>
      </div>

      <Modal
        abierto={modalAbierto && !confirmando}
        onCerrar={() => setModalAbierto(false)}
        className="bg-white dark:bg-neutral-900 text-black dark:text-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md p-7 space-y-5 max-h-[90vh] overflow-y-auto shadow-2xl"
      >
            <div>
              <h2 className="text-lg font-bold text-neutral-900 dark:text-white">
                {modoEdicionId ? "Editar solicitud" : "Registrar pasaje del día"}
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">Completa los datos del viaje</p>
            </div>

            {esSupervisor && !modoEdicionId && (
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                  ¿Para quién es esta solicitud?
                </label>
                <div className="mt-1.5">
                  <ComboboxBuscable
                    opciones={opcionesColaborador}
                    value={colaboradorSeleccionado}
                    onChange={cambiarColaborador}
                    placeholder="Selecciona un colaborador"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Fecha</label>
              <div className="mt-1.5">
                <CalendarioSelector value={fecha} onChange={setFecha} fechaMinima={fechaMinima} />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Ruta</label>
              <div className="mt-1.5">
                <ComboboxBuscable
                  opciones={opcionesRutas}
                  value={rutaId}
                  onChange={setRutaId}
                  placeholder="Selecciona una ruta"
                  cargando={cargandoRutas}
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Valor</label>
              <input
                type="text"
                readOnly
                value={valorSeleccionado !== null ? `${formatearMoneda(valorSeleccionado)}` : ""}
                placeholder="Se llena al elegir la ruta"
                className="mt-1.5 w-full rounded-xl border border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/60 text-neutral-600 dark:text-neutral-400 px-3.5 py-3 text-sm cursor-not-allowed"
              />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                Observaciones (opcional)
              </label>
              <textarea
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value.toUpperCase())}
                rows={2}
                className={`${CLASE_CAMPO} resize-none`}
                placeholder="Algún comentario adicional..."
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex gap-2 justify-end pt-1">
              <button
                type="button"
                onClick={() => { setModalAbierto(false); setModoEdicionId(null); }}
                className="px-4 py-2.5 text-sm font-medium text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!fecha || !rutaId}
                onClick={() => setConfirmando(true)}
                className="px-5 py-2.5 text-sm font-semibold bg-orange-500 hover:bg-orange-600 text-white rounded-xl disabled:opacity-40 transition shadow-sm hover:shadow-md"
              >
                {modoEdicionId ? "Guardar cambios" : "Guardar"}
              </button>
            </div>
      </Modal>

      <Modal abierto={confirmando} onCerrar={() => setConfirmando(false)} variante="centro" className="bg-white dark:bg-neutral-900 text-black dark:text-white rounded-3xl p-7 w-full max-w-xs text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center mx-auto"><IconoPregunta className="w-6 h-6" /></div>
            <p className="font-semibold text-neutral-900 dark:text-white">
              {modoEdicionId ? "¿Guardar los cambios?" : "¿Seguro que quieres registrar este pasaje?"}
            </p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">{formatearFecha(fecha)} · {formatearMoneda(valorSeleccionado ?? 0)}</p>
            <div className="flex gap-2 justify-center pt-1">
              <button
                onClick={() => setConfirmando(false)}
                disabled={enviando}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
              >
                Cancelar
              </button>
                <button
                  onClick={confirmarRegistro}
                  disabled={enviando}
                  className="flex-1 px-4 py-2.5 text-sm font-semibold bg-orange-500 hover:bg-orange-600 text-white rounded-xl disabled:opacity-50 transition flex items-center justify-center gap-2"
                >
                  {enviando && <Spinner className="w-4 h-4" />}
                  {enviando ? "Guardando..." : "Confirmar"}
                </button>
            </div>
      </Modal>
    </div>
  );
}