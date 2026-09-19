// components/PanelColaborador.tsx
// Panel del colaborador/supervisor: buscador, tabla con observaciones
// visibles, Editar/Eliminar mientras esté Pendiente o Rechazada, historial
// de pagos, y confirmaciones con diseño propio.

"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { formatearMoneda } from "../lib/formato";
import { DESCRIPCION_ESTADO } from "../lib/estadosSolicitud";
import CalendarioSelector from "./CalendarioSelector";
import ComboboxBuscable from "./ComboboxBuscable";
import Modal from "./Modal";
import Paginacion from "./Paginacion";
import { formatearFecha, fechaHoyTexto } from "../lib/fechas";
import Spinner from "./Spinner";
import { useToast } from "./Toast";
import EstadoVacio from "./EstadoVacio";
import MenuAcciones from "./MenuAcciones";
import Avatar from "./Avatar";
import SelectorVista, { type VistaListado } from "./SelectorVista";
import FilaRutasSeleccionables, { type RutaSimple } from "./FilaRutasSeleccionables";
import NotificacionesPush from "./NotificacionesPush";
import { IconoPregunta, IconoLupa, IconoAlerta, IconoChevron } from "./Icons";

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

export default function PanelColaborador() {
  const toast = useToast();

  const [colaboradorId, setColaboradorId] = useState("");
  const [nombreCompleto, setNombreCompleto] = useState("");
  const [esSupervisor, setEsSupervisor] = useState(false);
  const [equipo, setEquipo] = useState<MiembroEquipo[]>([]);
  // Rutas de cada miembro del equipo (uno mismo incluido), ya cargadas
  // junto con la página — abrir "Nueva solicitud" no dispara ningún pedido
  // de red, es instantáneo aunque el equipo tenga cientos de personas.
  const [rutasEquipo, setRutasEquipo] = useState<Record<string, RutaSimple[]>>({});
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [cargandoInicial, setCargandoInicial] = useState(true);
  const [errorInicial, setErrorInicial] = useState("");
  const rutasPropias = useMemo(() => rutasEquipo[colaboradorId] ?? [], [rutasEquipo, colaboradorId]);

  const cargarDatos = async () => {
    try {
      const res = await fetch("/api/mis-pasajes/datos");
      if (!res.ok) {
        setErrorInicial("No se pudo cargar la información. Intenta de nuevo.");
        return;
      }
      const data = await res.json();
      setColaboradorId(data.colaboradorId);
      setNombreCompleto(data.nombreCompleto);
      setEsSupervisor(data.esSupervisor);
      setEquipo(data.equipo);
      setRutasEquipo(data.rutasEquipo);
      setSolicitudes(data.solicitudes);
      setErrorInicial("");
    } catch {
      setErrorInicial("No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.");
    }
  };

  useEffect(() => {
    let cancelado = false;
    fetch("/api/mis-pasajes/datos")
      .then(async (res) => {
        if (cancelado) return;
        if (!res.ok) {
          setErrorInicial("No se pudo cargar la información. Intenta de nuevo.");
          return;
        }
        const data = await res.json();
        setColaboradorId(data.colaboradorId);
        setNombreCompleto(data.nombreCompleto);
        setEsSupervisor(data.esSupervisor);
        setEquipo(data.equipo);
        setRutasEquipo(data.rutasEquipo);
        setSolicitudes(data.solicitudes);
      })
      .catch(() => {
        if (!cancelado) setErrorInicial("No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.");
      })
      .finally(() => {
        if (!cancelado) setCargandoInicial(false);
      });
    return () => {
      cancelado = true;
    };
  }, []);

  const [busqueda, setBusqueda] = useState("");
  const [paginaActual, setPaginaActual] = useState(1);
  // "Por colaborador" está disponible para cualquiera: un colaborador sin
  // equipo simplemente ve una sola tarjeta (la suya); un supervisor ve la
  // suya más la de cada persona a su cargo.
  const [vista, setVista] = useState<VistaListado>("lista");
  const [tarjetasAbiertas, setTarjetasAbiertas] = useState<Set<string>>(new Set());
  const alternarTarjeta = (id: string) => {
    setTarjetasAbiertas((prev) => {
      const copia = new Set(prev);
      if (copia.has(id)) copia.delete(id);
      else copia.add(id);
      return copia;
    });
  };

  // Al eliminar, la fila se oculta al instante (con opción de deshacer)
  // sin tocar el array que vino del servidor — así "Crear"/"Editar" siguen
  // funcionando con su cargarDatos() de siempre, sin pisarse con esto.
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

  // ---------- Eliminar en bloque ----------
  const [seleccionadas, setSeleccionadas] = useState<Set<string>>(new Set());
  const [confirmandoLote, setConfirmandoLote] = useState(false);
  const [eliminandoLote, setEliminandoLote] = useState(false);
  const [errorLote, setErrorLote] = useState("");

  const [modalAbierto, setModalAbierto] = useState(false);
  const [modoEdicionId, setModoEdicionId] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");


  // Usados solo en modo edición (una solicitud existente = un colaborador,
  // una ruta). El modo creación usa los estados de "lote" más abajo.
  const [colaboradorSeleccionado, setColaboradorSeleccionado] = useState(colaboradorId);
  const [fecha, setFecha] = useState("");
  const [rutaId, setRutaId] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [rutasDisponibles, setRutasDisponibles] = useState<RutaSimple[]>(rutasPropias);
  const [cargandoRutas, setCargandoRutas] = useState(false);

  // ---------- Crear en lote: uno o más colaboradores (si sos supervisor),
  // una o más rutas cada uno, todo para la misma fecha (ver
  // /api/solicitudes/crear-lote). Acordeón: un colaborador a la vez
  // expandido, para que la lista no se estire con equipos grandes. ----------
  const [rutasElegidasPorColaborador, setRutasElegidasPorColaborador] = useState<Record<string, string[]>>({});
  // Cada ruta elegida tiene su propia observación (no una sola compartida
  // para todo el lote) — clave compuesta porque el mismo rutaId puede
  // repetirse entre distintos colaboradores del mismo área.
  const [observacionesPorItem, setObservacionesPorItem] = useState<Record<string, string>>({});
  const claveItem = (idColaborador: string, idRuta: string) => `${idColaborador}::${idRuta}`;
  const [colaboradorExpandidoId, setColaboradorExpandidoId] = useState<string | null>(null);
  const [busquedaEquipoModal, setBusquedaEquipoModal] = useState("");
  // Una sola observación abierta a la vez en todo el modal (mismo criterio
  // que el acordeón de colaboradores) — abrir otra colapsa la anterior.
  const [observacionAbiertaClave, setObservacionAbiertaClave] = useState<string | null>(null);
  const alternarObservacion = (clave: string) => {
    setObservacionAbiertaClave((prev) => (prev === clave ? null : clave));
  };

  // Vista "Por colaborador": una tarjeta por cada miembro del equipo (uno
  // mismo primero) con sus solicitudes agrupadas — todo derivado en el
  // cliente, sin pedir nada al servidor, porque ya tenemos la lista
  // completa filtrada en memoria (a diferencia del Historial, que agrupa
  // por API porque maneja muchas más filas).
  const colaboradoresParaTarjetas = useMemo(
    () => [{ id: colaboradorId, nombreCompleto }, ...equipo],
    [colaboradorId, nombreCompleto, equipo]
  );
  const solicitudesPorColaborador = useMemo(() => {
    const mapa = new Map<string, Solicitud[]>();
    for (const s of solicitudesFiltradas) {
      if (!mapa.has(s.colaboradorId)) mapa.set(s.colaboradorId, []);
      mapa.get(s.colaboradorId)!.push(s);
    }
    return mapa;
  }, [solicitudesFiltradas]);
  const tarjetasColaborador = useMemo(
    () =>
      colaboradoresParaTarjetas
        .map((c) => ({ ...c, solicitudes: solicitudesPorColaborador.get(c.id) ?? [] }))
        .filter((c) => c.solicitudes.length > 0),
    [colaboradoresParaTarjetas, solicitudesPorColaborador]
  );

  const totalPaginas = Math.max(1, Math.ceil(solicitudesFiltradas.length / POR_PAGINA));
  const solicitudesPagina = useMemo(
    () => solicitudesFiltradas.slice((paginaActual - 1) * POR_PAGINA, paginaActual * POR_PAGINA),
    [solicitudesFiltradas, paginaActual]
  );
  const totalGeneral = useMemo(
    () => solicitudesFiltradas.reduce((acc, s) => acc + s.montoTotal, 0),
    [solicitudesFiltradas]
  );

  // Solo se pueden eliminar (individual o en bloque) las Pendientes o
  // Rechazadas, igual que valida la API — mismo criterio que el menú "⋮".
  const solicitudesEliminablesPagina = useMemo(
    () => solicitudesPagina.filter((s) => s.estado === "PENDIENTE" || s.estado === "RECHAZADA"),
    [solicitudesPagina]
  );
  const todasEnPaginaSeleccionadas =
    solicitudesEliminablesPagina.length > 0 && solicitudesEliminablesPagina.every((s) => seleccionadas.has(s.id));

  const alternarSeleccion = (id: string) => {
    setSeleccionadas((prev) => {
      const copia = new Set(prev);
      if (copia.has(id)) copia.delete(id);
      else copia.add(id);
      return copia;
    });
  };

  const alternarSeleccionarTodo = () => {
    setSeleccionadas((prev) => {
      const copia = new Set(prev);
      if (todasEnPaginaSeleccionadas) solicitudesEliminablesPagina.forEach((s) => copia.delete(s.id));
      else solicitudesEliminablesPagina.forEach((s) => copia.add(s.id));
      return copia;
    });
  };

  const eliminarLote = async () => {
    setEliminandoLote(true);
    setErrorLote("");
    try {
      const res = await fetch("/api/solicitudes/eliminar-lote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(seleccionadas) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorLote(data.error ?? "No se pudo eliminar");
        toast.error(data.error ?? "No se pudieron eliminar las solicitudes");
        return;
      }
      setConfirmandoLote(false);
      setSeleccionadas(new Set());
      toast.exito(
        data.omitidas > 0
          ? `${data.eliminadas} solicitud(es) eliminada(s); ${data.omitidas} se omitieron`
          : `${data.eliminadas} solicitud(es) eliminada(s)`
      );
      await cargarDatos();
    } catch {
      setErrorLote("No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.");
      toast.error("No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setEliminandoLote(false);
    }
  };

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

  // Acordeón: expandir uno colapsa el que estaba abierto — con equipos de
  // cientos de personas, tener varios abiertos a la vez volvería la lista
  // interminable.
  const alternarExpandido = (id: string) => {
    setColaboradorExpandidoId((prev) => (prev === id ? null : id));
    setObservacionAbiertaClave(null);
  };

  const equipoVisibleModal = useMemo(() => {
    const texto = busquedaEquipoModal.trim().toLowerCase();
    if (!texto) return colaboradoresParaTarjetas;
    return colaboradoresParaTarjetas.filter((c) => c.nombreCompleto.toLowerCase().includes(texto));
  }, [colaboradoresParaTarjetas, busquedaEquipoModal]);

  const alternarRutaLote = (idColaborador: string, idRuta: string) => {
    setRutasElegidasPorColaborador((prev) => {
      const actuales = prev[idColaborador] ?? [];
      const nuevas = actuales.includes(idRuta) ? actuales.filter((r) => r !== idRuta) : [...actuales, idRuta];
      return { ...prev, [idColaborador]: nuevas };
    });
  };

  const cambiarObservacionItem = (idColaborador: string, idRuta: string, valor: string) => {
    setObservacionesPorItem((prev) => ({ ...prev, [claveItem(idColaborador, idRuta)]: valor }));
  };

  // Solo se registran solicitudes para quien tenga al menos una ruta
  // marcada — no hace falta una selección de colaboradores aparte.
  const itemsLote = useMemo(
    () =>
      Object.entries(rutasElegidasPorColaborador).flatMap(([cId, rutaIds]) =>
        rutaIds.map((rId) => ({
          colaboradorId: cId,
          rutaId: rId,
          observaciones: observacionesPorItem[claveItem(cId, rId)] ?? "",
        }))
      ),
    [rutasElegidasPorColaborador, observacionesPorItem]
  );

  const totalLote = useMemo(
    () =>
      itemsLote.reduce((acc, it) => {
        const ruta = (rutasEquipo[it.colaboradorId] ?? []).find((r) => r.id === it.rutaId);
        return acc + (ruta?.valor ?? 0);
      }, 0),
    [itemsLote, rutasEquipo]
  );

  const abrirModal = () => {
    setModoEdicionId(null);
    setModalAbierto(true);
    setColaboradorSeleccionado(colaboradorId);
    setRutasDisponibles(rutasPropias);
    setFecha(fechaHoyTexto());
    setRutaId("");
    setObservaciones("");
    setError("");
    setRutasElegidasPorColaborador({});
    setObservacionesPorItem({});
    setColaboradorExpandidoId(null);
    setBusquedaEquipoModal("");
    setObservacionAbiertaClave(null);
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

    const editando = !!modoEdicionId;
    const url = editando ? `/api/solicitudes/${modoEdicionId}` : "/api/solicitudes/crear-lote";
    const method = editando ? "PATCH" : "POST";
    const body = editando
      ? { colaboradorId: colaboradorSeleccionado, rutaId, fecha, observaciones }
      : { fecha, items: itemsLote };

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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
      if (editando) {
        toast.exito("Solicitud actualizada");
      } else {
        const data = await res.json().catch(() => ({ creadas: itemsLote.length }));
        const n = data.creadas ?? itemsLote.length;
        toast.exito(`${n} solicitud${n === 1 ? "" : "es"} registrada${n === 1 ? "" : "s"}`);
      }
      await cargarDatos();
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
          await cargarDatos();
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
            {seleccionadas.size > 0 && (
              <button
                onClick={() => { setConfirmandoLote(true); setErrorLote(""); }}
                className="text-xs sm:text-sm font-semibold bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-lg transition shadow-sm hover:shadow-md"
              >
                Eliminar seleccionadas ({seleccionadas.size})
              </button>
            )}
            <button
              onClick={abrirModal}
              className="text-xs sm:text-sm font-semibold bg-orange-500 hover:bg-orange-600 text-black px-3 py-2 rounded-lg transition shadow-sm hover:shadow-md hover:-translate-y-0.5"
            >
              + Nueva solicitud
            </button>
          </div>
        </div>

        <NotificacionesPush />

        {errorInicial && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{errorInicial}</div>
        )}

        {cargandoInicial ? (
          <div className="flex items-center justify-center gap-2.5 py-24 text-sm text-neutral-400 dark:text-neutral-500">
            <Spinner className="w-4 h-4" /> Cargando...
          </div>
        ) : (
        <>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <div className="relative max-w-sm flex-1">
            <IconoLupa className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 dark:text-neutral-500 pointer-events-none" />
            <input
              value={busqueda}
              onChange={(e) => cambiarBusqueda(e.target.value)}
              placeholder="Buscar por código, ruta, colaborador u observación..."
              className="w-full rounded-xl border border-neutral-300 bg-white text-neutral-900 pl-10 pr-4 py-2.5 text-sm placeholder-neutral-500 focus:border-orange-400 focus:ring-2 focus:ring-orange-500/15 outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
            />
          </div>
          <SelectorVista valor={vista} onCambiar={setVista} className="sm:ml-auto" />
        </div>

        {vista === "colaborador" ? (
          <div className="space-y-3">
            {tarjetasColaborador.length === 0 && (
              <div className="bg-neutral-50 dark:bg-neutral-900 rounded-2xl shadow-sm ring-1 ring-black/5 dark:ring-white/10 px-4 py-10">
                <EstadoVacio mensaje={busqueda ? "Sin resultados para esa búsqueda" : "Aún no hay solicitudes registradas"} />
              </div>
            )}
            {tarjetasColaborador.map((c, i) => {
              const abierta = tarjetasAbiertas.has(c.id);
              const total = c.solicitudes.reduce((acc, s) => acc + s.montoTotal, 0);
              return (
                <div key={c.id} className="bg-neutral-50 dark:bg-neutral-900 rounded-2xl shadow-sm ring-1 ring-black/5 dark:ring-white/10 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => alternarTarjeta(c.id)}
                    className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-neutral-100/60 dark:hover:bg-neutral-800/60 transition"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <IconoChevron className={`w-4 h-4 text-neutral-400 dark:text-neutral-500 shrink-0 transition-transform ${abierta ? "rotate-90" : ""}`} />
                      <Avatar nombre={c.nombreCompleto} indice={i} className="w-9 h-9 text-xs" />
                      <div className="min-w-0">
                        <p className="font-semibold text-neutral-900 dark:text-white truncate">
                          {c.nombreCompleto}
                          {c.id === colaboradorId && <span className="text-neutral-400 dark:text-neutral-500 text-xs font-normal ml-1">(yo)</span>}
                        </p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">
                          {c.solicitudes.length} {c.solicitudes.length === 1 ? "solicitud" : "solicitudes"}
                        </p>
                      </div>
                    </div>
                    <span className="font-semibold text-neutral-800 dark:text-neutral-200 shrink-0">{formatearMoneda(total)}</span>
                  </button>

                  {abierta && (
                    <div className="border-t border-neutral-200/70 dark:border-neutral-800/70 divide-y divide-neutral-200/70 dark:divide-neutral-800/70">
                      {c.solicitudes.map((s) => (
                        <div key={s.id} className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-4 py-3 text-sm">
                          <input
                            type="checkbox"
                            checked={seleccionadas.has(s.id)}
                            onChange={() => alternarSeleccion(s.id)}
                            disabled={!(s.estado === "PENDIENTE" || s.estado === "RECHAZADA")}
                            className="w-4 h-4 accent-orange-500 rounded shrink-0 disabled:opacity-0"
                          />
                          <span className="font-mono font-bold tracking-widest text-neutral-500 dark:text-neutral-400 text-xs">{s.codigo}</span>
                          <span className="font-medium">{formatearFecha(s.fecha)}</span>
                          <span className="text-neutral-600 dark:text-neutral-300">{s.rutaLabel}</span>
                          <span className="text-neutral-500 dark:text-neutral-400">{formatearMoneda(s.montoTotal)}</span>
                          {s.observaciones && (
                            <span className="text-neutral-500 dark:text-neutral-400 max-w-[220px] truncate" title={s.observaciones}>{s.observaciones}</span>
                          )}
                          <span title={DESCRIPCION_ESTADO[s.estado]} className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${ESTILOS_ESTADO[s.estado]}`}>
                            {s.estado}
                          </span>
                          <span className="ml-auto">
                            {(s.estado === "PENDIENTE" || s.estado === "RECHAZADA") && (
                              <MenuAcciones
                                acciones={[
                                  { label: "Editar", onClick: () => abrirEdicion(s) },
                                  { label: "Eliminar", tono: "peligro", onClick: () => eliminarConDeshacer(s) },
                                ]}
                              />
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
        <div className="bg-neutral-50 dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 rounded-2xl overflow-hidden shadow-sm ring-1 ring-black/5 dark:ring-white/10">
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[760px]">
              <thead className="bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 text-left">
                <tr>
                  <th className="px-4 py-3 w-8">
                    <input
                      type="checkbox"
                      checked={todasEnPaginaSeleccionadas}
                      onChange={alternarSeleccionarTodo}
                      className="w-4 h-4 accent-orange-500 rounded"
                    />
                  </th>
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
                    <td className="px-4 py-3">
                      {(s.estado === "PENDIENTE" || s.estado === "RECHAZADA") && (
                        <input
                          type="checkbox"
                          checked={seleccionadas.has(s.id)}
                          onChange={() => alternarSeleccion(s.id)}
                          className="w-4 h-4 accent-orange-500 rounded"
                        />
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono font-bold tracking-widest text-neutral-500 dark:text-neutral-400">{s.codigo}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{formatearFecha(s.fecha)}</p>
                      <p className="text-[11px] text-neutral-400 dark:text-neutral-500">
                        {new Date(s.fechaSolicitud).toLocaleTimeString("es-EC", { hour: "2-digit", minute: "2-digit" })}
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
                    <td className="px-4 py-3 text-neutral-500 dark:text-neutral-400 max-w-[260px] whitespace-normal break-words">
                      {s.observaciones || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span title={DESCRIPCION_ESTADO[s.estado]} className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${ESTILOS_ESTADO[s.estado]}`}>
                        {s.estado}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {(s.estado === "PENDIENTE" || s.estado === "RECHAZADA") && (
                        <MenuAcciones
                          acciones={[
                            { label: "Editar", onClick: () => abrirEdicion(s) },
                            { label: "Eliminar", tono: "peligro", onClick: () => eliminarConDeshacer(s) },
                          ]}
                        />
                      )}
                    </td>
                  </tr>
                ))}
                {solicitudesFiltradas.length === 0 && (
                  <tr>
                    <td colSpan={esSupervisor ? 9 : 8} className="px-4 py-10">
                      <EstadoVacio mensaje={busqueda ? "Sin resultados para esa búsqueda" : "Aún no hay solicitudes registradas"} />
                    </td>
                  </tr>
                )}
              </tbody>

              {solicitudesFiltradas.length > 0 && (
                <tfoot>
                  <tr className="border-t border-neutral-200 dark:border-neutral-800 bg-neutral-100/70 dark:bg-neutral-800/60 font-semibold">
                    <td className="px-4 py-3" colSpan={esSupervisor ? 5 : 4}>
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
        )}
        </>
        )}
      </div>

      <Modal
        abierto={modalAbierto && !confirmando}
        onCerrar={() => setModalAbierto(false)}
        className={`bg-white dark:bg-neutral-900 text-black dark:text-white rounded-t-3xl sm:rounded-3xl w-full ${
          modoEdicionId ? "sm:max-w-md" : "sm:max-w-3xl"
        } p-7 space-y-5 max-h-[90vh] overflow-y-auto shadow-2xl`}
      >
            <div>
              <h2 className="text-lg font-bold text-neutral-900 dark:text-white">
                {modoEdicionId ? "Editar solicitud" : "Registrar pasajes"}
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                {modoEdicionId
                  ? "Completa los datos del viaje"
                  : esSupervisor
                  ? "Elige uno o más colaboradores y, para cada uno, una o más rutas"
                  : "Elige una o más rutas para el mismo día"}
              </p>
            </div>

            <div className="max-w-xs">
              <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Fecha</label>
              <div className="mt-1.5">
                <CalendarioSelector value={fecha} onChange={setFecha} fechaMinima={fechaMinima} />
              </div>
            </div>

            {modoEdicionId ? (
              <>
                {esSupervisor && (
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
              </>
            ) : (
              <>
                {colaboradoresParaTarjetas.length === 1 ? (
                  // Sin equipo (colaborador sin gente a cargo): directo la
                  // lista de sus rutas, sin acordeón de por medio.
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Rutas</label>
                    <div className="mt-1.5 rounded-xl ring-1 ring-black/5 dark:ring-white/10 overflow-hidden max-h-[320px] overflow-y-auto divide-y divide-neutral-100 dark:divide-neutral-800">
                      <FilaRutasSeleccionables
                        rutas={rutasEquipo[colaboradorId] ?? []}
                        elegidas={rutasElegidasPorColaborador[colaboradorId] ?? []}
                        onAlternarRuta={(rId) => alternarRutaLote(colaboradorId, rId)}
                        observaciones={observacionesPorItem}
                        onCambiarObservacion={(rId, v) => cambiarObservacionItem(colaboradorId, rId, v)}
                        claveItem={claveItem}
                        colaboradorId={colaboradorId}
                        observacionAbiertaClave={observacionAbiertaClave}
                        onAlternarObservacion={alternarObservacion}
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                      Colaboradores — tocá uno para ver y marcar sus rutas
                    </label>
                    <div className="mt-1.5 relative">
                      <IconoLupa className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 dark:text-neutral-500 pointer-events-none" />
                      <input
                        value={busquedaEquipoModal}
                        onChange={(e) => setBusquedaEquipoModal(e.target.value)}
                        placeholder="Buscar colaborador..."
                        className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white pl-10 pr-3.5 py-2.5 text-sm placeholder-neutral-400 focus:border-orange-400 focus:ring-2 focus:ring-orange-500/15 outline-none"
                      />
                    </div>

                    <div className="mt-2 rounded-xl ring-1 ring-black/5 dark:ring-white/10 overflow-hidden max-h-[380px] overflow-y-auto divide-y divide-neutral-100 dark:divide-neutral-800">
                      {equipoVisibleModal.map((c, i) => {
                        const expandido = colaboradorExpandidoId === c.id;
                        const elegidasDeEste = rutasElegidasPorColaborador[c.id] ?? [];
                        const totalDeEste = elegidasDeEste.reduce((acc, rId) => {
                          const ruta = (rutasEquipo[c.id] ?? []).find((r) => r.id === rId);
                          return acc + (ruta?.valor ?? 0);
                        }, 0);
                        return (
                          <div key={c.id}>
                            <button
                              type="button"
                              onClick={() => alternarExpandido(c.id)}
                              className="w-full flex items-center justify-between gap-3 px-3.5 py-2.5 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800/60 transition"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <IconoChevron className={`w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500 shrink-0 transition-transform ${expandido ? "rotate-90" : ""}`} />
                                <Avatar nombre={c.nombreCompleto} indice={i} className="w-7 h-7 text-[11px]" />
                                <span className="text-sm text-neutral-800 dark:text-neutral-200 truncate">
                                  {c.nombreCompleto}
                                  {c.id === colaboradorId && <span className="text-neutral-400 dark:text-neutral-500 text-xs font-normal ml-1">(yo)</span>}
                                </span>
                              </div>
                              {elegidasDeEste.length > 0 && (
                                <span className="text-[11px] font-semibold text-orange-600 dark:text-orange-400 shrink-0">
                                  {elegidasDeEste.length} ruta{elegidasDeEste.length === 1 ? "" : "s"} · {formatearMoneda(totalDeEste)}
                                </span>
                              )}
                            </button>
                            {expandido && (
                              <div className="bg-neutral-50 dark:bg-neutral-800/40 border-t border-neutral-100 dark:border-neutral-800">
                                <FilaRutasSeleccionables
                                  rutas={rutasEquipo[c.id] ?? []}
                                  elegidas={elegidasDeEste}
                                  onAlternarRuta={(rId) => alternarRutaLote(c.id, rId)}
                                  observaciones={observacionesPorItem}
                                  onCambiarObservacion={(rId, v) => cambiarObservacionItem(c.id, rId, v)}
                                  claveItem={claveItem}
                                  colaboradorId={c.id}
                                  observacionAbiertaClave={observacionAbiertaClave}
                                  onAlternarObservacion={alternarObservacion}
                                  indentado
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {equipoVisibleModal.length === 0 && (
                        <p className="px-3.5 py-6 text-xs text-neutral-400 dark:text-neutral-500 text-center">Sin resultados para esa búsqueda</p>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}

            {!modoEdicionId && itemsLote.length > 0 && (
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Se van a registrar <span className="font-semibold text-neutral-700 dark:text-neutral-200">{itemsLote.length} solicitud{itemsLote.length === 1 ? "" : "es"}</span> por un total de <span className="font-semibold text-neutral-700 dark:text-neutral-200">{formatearMoneda(totalLote)}</span>.
              </p>
            )}

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
                disabled={modoEdicionId ? !fecha || !rutaId : !fecha || itemsLote.length === 0}
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
              {modoEdicionId
                ? "¿Guardar los cambios?"
                : `¿Registrar ${itemsLote.length} solicitud${itemsLote.length === 1 ? "" : "es"}?`}
            </p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              {modoEdicionId
                ? `${formatearFecha(fecha)} · ${formatearMoneda(valorSeleccionado ?? 0)}`
                : `${formatearFecha(fecha)} · ${formatearMoneda(totalLote)}`}
            </p>
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

      <Modal abierto={confirmandoLote} onCerrar={() => setConfirmandoLote(false)} variante="centro" className="bg-white dark:bg-neutral-900 text-black dark:text-white rounded-3xl p-7 w-full max-w-xs text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto"><IconoAlerta className="w-6 h-6" /></div>
            <p className="font-semibold text-neutral-900 dark:text-white">¿Eliminar {seleccionadas.size} solicitud{seleccionadas.size === 1 ? "" : "es"}?</p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Esta acción no se puede deshacer.</p>
            {errorLote && <p className="text-sm text-red-600">{errorLote}</p>}
            <div className="flex gap-2 justify-center pt-1">
              <button
                onClick={() => setConfirmandoLote(false)}
                disabled={eliminandoLote}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
              >
                Cancelar
              </button>
              <button
                onClick={eliminarLote}
                disabled={eliminandoLote}
                className="flex-1 px-4 py-2.5 text-sm font-semibold bg-red-500 hover:bg-red-600 text-white rounded-xl disabled:opacity-50 transition flex items-center justify-center gap-2"
              >
                {eliminandoLote && <Spinner className="w-4 h-4" />}
                {eliminandoLote ? "Eliminando..." : "Sí, eliminar"}
              </button>
            </div>
      </Modal>
    </div>
  );
}