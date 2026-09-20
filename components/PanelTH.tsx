// components/PanelTH.tsx
// Panel de Talento Humano: buscador, cola de solicitudes PENDIENTES con
// selección múltiple para aprobar en lote, "Devolver para corrección",
// paginación, total, y aviso si no tiene áreas asignadas.

"use client";

import { useState, useMemo, useEffect } from "react";
import { formatearMoneda } from "../lib/formato";
import { IconoCheck, IconoLupa, IconoDevolver } from "./Icons";
import EstadoVacio from "./EstadoVacio";
import Avatar from "./Avatar";
import Paginacion from "./Paginacion";
import Modal from "./Modal";
import ComboboxBuscable from "./ComboboxBuscable";
import SelectorVista, { type VistaListado } from "./SelectorVista";
import { formatearFecha } from "../lib/fechas";
import Spinner from "./Spinner";
import { useToast } from "./Toast";
import TablaColaboradores, { type FilaColaborador } from "./TablaColaboradores";
import EncabezadoOrdenable from "./EncabezadoOrdenable";
import { useOrdenTabla } from "../lib/useOrdenTabla";
import { useNavegacionFilas } from "../lib/useNavegacionFilas";

type Pendiente = {
  id: string;
  codigo: string;
  fecha: string;
  fechaSolicitud: string;
  montoTotal: number;
  observaciones: string | null;
  colaboradorId: string;
  nombreColaborador: string;
  supervisorId: string | null;
  supervisorNombre: string | null;
  rutaLabel: string;
};

type CampoOrden = "codigo" | "fecha" | "nombreColaborador" | "rutaLabel" | "montoTotal";
const VALOR_ORDEN: Record<CampoOrden, (p: Pendiente) => string | number> = {
  codigo: (p) => p.codigo,
  fecha: (p) => p.fecha,
  nombreColaborador: (p) => p.nombreColaborador,
  rutaLabel: (p) => p.rutaLabel,
  montoTotal: (p) => p.montoTotal,
};

const POR_PAGINA = 8;

// Sentinel para el filtro "Sin supervisor (solicita directo)" — no es un
// id real de colaborador, así que no puede chocar con uno.
const SIN_SUPERVISOR = "__sin_supervisor__";

export default function PanelTH() {
  const toast = useToast();

  // Copia local editable: al aprobar/devolver se quita la fila al instante
  // (no hace falta esperar un router.refresh() ni volver a pedirle la
  // lista entera al servidor — ya sabemos exactamente qué cambió).
  const [pendientes, setPendientes] = useState<Pendiente[]>([]);
  const [sinAsignaciones, setSinAsignaciones] = useState(false);
  const [cargandoInicial, setCargandoInicial] = useState(true);
  const [errorInicial, setErrorInicial] = useState("");

  useEffect(() => {
    let cancelado = false;
    fetch("/api/th/aprobaciones/pendientes")
      .then(async (res) => {
        if (cancelado) return;
        if (!res.ok) {
          setErrorInicial("No se pudo cargar la información. Intenta de nuevo.");
          return;
        }
        const data = await res.json();
        setPendientes(data.pendientes);
        setSinAsignaciones(data.sinAsignaciones);
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
  const [supervisorId, setSupervisorId] = useState("");
  const [paginaActual, setPaginaActual] = useState(1);
  const [vista, setVista] = useState<VistaListado>("lista");

  // Opciones del filtro "Supervisor": solo los que de verdad tienen algo
  // pendiente ahora mismo (no todos los supervisores de la empresa), más
  // "Sin supervisor" para quienes solicitan directo con su propio PIN.
  const supervisoresOpciones = useMemo(() => {
    const vistos = new Map<string, string>();
    let haySinSupervisor = false;
    for (const p of pendientes) {
      if (p.supervisorId) vistos.set(p.supervisorId, p.supervisorNombre ?? "");
      else haySinSupervisor = true;
    }
    const opciones = Array.from(vistos.entries())
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
    if (haySinSupervisor) opciones.push({ id: SIN_SUPERVISOR, label: "Sin supervisor (solicita directo)" });
    return opciones;
  }, [pendientes]);

  const pendientesFiltradas = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return pendientes.filter((p) => {
      if (supervisorId === SIN_SUPERVISOR && p.supervisorId) return false;
      if (supervisorId && supervisorId !== SIN_SUPERVISOR && p.supervisorId !== supervisorId) return false;
      if (!texto) return true;
      return (
        p.codigo.toLowerCase().includes(texto) ||
        p.nombreColaborador.toLowerCase().includes(texto) ||
        p.rutaLabel.toLowerCase().includes(texto) ||
        (p.observaciones ?? "").toLowerCase().includes(texto)
      );
    });
  }, [pendientes, busqueda, supervisorId]);

  const cambiarBusqueda = (v: string) => {
    setBusqueda(v);
    setPaginaActual(1);
  };

  const cambiarSupervisor = (v: string) => {
    setSupervisorId(v);
    setPaginaActual(1);
  };

  const { orden, ordenar, itemsOrdenados: pendientesOrdenadas } = useOrdenTabla<Pendiente, CampoOrden>(
    pendientesFiltradas,
    (p, campo) => VALOR_ORDEN[campo](p),
    "th-aprobaciones"
  );

  const totalPaginas = Math.max(1, Math.ceil(pendientesFiltradas.length / POR_PAGINA));
  const pendientesPagina = useMemo(
    () => pendientesOrdenadas.slice((paginaActual - 1) * POR_PAGINA, paginaActual * POR_PAGINA),
    [pendientesOrdenadas, paginaActual]
  );
  const totalGeneral = useMemo(
    () => pendientesFiltradas.reduce((acc, s) => acc + s.montoTotal, 0),
    [pendientesFiltradas]
  );

  // Vista "Por colaborador": un grupo por cada colaborador con al menos
  // una pendiente, derivado en el cliente (misma idea que Mis Pasajes).
  const gruposColaborador = useMemo(() => {
    const mapa = new Map<string, { nombre: string; solicitudes: Pendiente[] }>();
    for (const p of pendientesFiltradas) {
      if (!mapa.has(p.colaboradorId)) mapa.set(p.colaboradorId, { nombre: p.nombreColaborador, solicitudes: [] });
      mapa.get(p.colaboradorId)!.solicitudes.push(p);
    }
    return mapa;
  }, [pendientesFiltradas]);

  const filasColaborador: FilaColaborador[] = useMemo(
    () =>
      Array.from(gruposColaborador.entries())
        .map(([id, g]) => ({
          id,
          nombre: g.nombre,
          cantidad: g.solicitudes.length,
          total: g.solicitudes.reduce((acc, s) => acc + s.montoTotal, 0),
        }))
        .sort((a, b) => a.nombre.localeCompare(b.nombre)),
    [gruposColaborador]
  );

  const [seleccionadas, setSeleccionadas] = useState<Set<string>>(new Set());
  const todasEnPaginaSeleccionadas =
    pendientesPagina.length > 0 && pendientesPagina.every((s) => seleccionadas.has(s.id));

  const alternarSeleccion = (id: string) => {
    setSeleccionadas((prev) => {
      const copia = new Set(prev);
      copia.has(id) ? copia.delete(id) : copia.add(id);
      return copia;
    });
  };

  const alternarSeleccionarTodo = () => {
    setSeleccionadas((prev) => {
      const copia = new Set(prev);
      if (todasEnPaginaSeleccionadas) {
        pendientesPagina.forEach((s) => copia.delete(s.id));
      } else {
        pendientesPagina.forEach((s) => copia.add(s.id));
      }
      return copia;
    });
  };

  // Selección en grupo desde la vista "Por colaborador": si ya están
  // todas seleccionadas las quita, si no las agrega todas — así se puede
  // marcar un colaborador entero (o "Seleccionar todos") sin expandirlo.
  const alternarGrupoSeleccion = (ids: string[]) => {
    setSeleccionadas((prev) => {
      const copia = new Set(prev);
      const todas = ids.every((id) => copia.has(id));
      ids.forEach((id) => (todas ? copia.delete(id) : copia.add(id)));
      return copia;
    });
  };

  const [idAAprobar, setIdAAprobar] = useState<string | null>(null);
  const [aprobandoLote, setAprobandoLote] = useState(false);
  const [confirmandoLote, setConfirmandoLote] = useState(false);
  const [aprobando, setAprobando] = useState(false);

  const [idADevolver, setIdADevolver] = useState<string | null>(null);
  const [comentarioDevolucion, setComentarioDevolucion] = useState("");
  const [devolviendo, setDevolviendo] = useState(false);

  const [confirmandoLoteDevolver, setConfirmandoLoteDevolver] = useState(false);
  const [comentarioLoteDevolver, setComentarioLoteDevolver] = useState("");
  const [devolviendoLote, setDevolviendoLote] = useState(false);

  const [error, setError] = useState("");

  const confirmarAprobar = async () => {
    if (!idAAprobar) return;
    setAprobando(true);
    setError("");
    try {
      const res = await fetch(`/api/solicitudes/${idAAprobar}/aprobar`, { method: "PATCH" });
      setIdAAprobar(null);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "No se pudo aprobar");
        toast.error(data.error ?? "No se pudo aprobar la solicitud");
        return;
      }
      toast.exito("Solicitud aprobada");
      setPendientes((prev) => prev.filter((p) => p.id !== idAAprobar));
    } catch {
      setIdAAprobar(null);
      setError("No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.");
      toast.error("No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setAprobando(false);
    }
  };

  const confirmarAprobarLote = async () => {
    setAprobandoLote(true);
    setError("");
    try {
      const res = await fetch(`/api/solicitudes/aprobar-lote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(seleccionadas) }),
      });
      setConfirmandoLote(false);

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "No se pudo aprobar el lote");
        toast.error(data.error ?? "No se pudo aprobar el lote");
        return;
      }
      toast.exito("Solicitudes aprobadas");
      const idsAprobados = new Set(seleccionadas);
      setPendientes((prev) => prev.filter((p) => !idsAprobados.has(p.id)));
      setSeleccionadas(new Set());
    } catch {
      setConfirmandoLote(false);
      setError("No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.");
      toast.error("No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setAprobandoLote(false);
    }
  };

  const abrirModalDevolucion = (id: string) => {
    setIdADevolver(id);
    setComentarioDevolucion("");
    setError("");
  };

  const confirmarDevolucion = async () => {
    if (!idADevolver) return;
    if (comentarioDevolucion.trim().length < 3) {
      setError("Escribe qué se debe corregir (mínimo 3 caracteres)");
      return;
    }
    setDevolviendo(true);
    setError("");
    try {
      const res = await fetch(`/api/solicitudes/${idADevolver}/rechazar`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comentario: comentarioDevolucion }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "No se pudo devolver la solicitud");
        toast.error(data.error ?? "No se pudo devolver la solicitud");
        return;
      }
      toast.exito("Solicitud devuelta para corrección");
      setPendientes((prev) => prev.filter((p) => p.id !== idADevolver));
      setIdADevolver(null);
    } catch {
      setError("No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.");
      toast.error("No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setDevolviendo(false);
    }
  };

  const confirmarDevolucionLote = async () => {
    if (comentarioLoteDevolver.trim().length < 3) {
      setError("Escribe qué se debe corregir (mínimo 3 caracteres)");
      return;
    }
    setDevolviendoLote(true);
    setError("");
    try {
      const res = await fetch(`/api/solicitudes/rechazar-lote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(seleccionadas), comentario: comentarioLoteDevolver }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "No se pudo devolver el lote");
        toast.error(data.error ?? "No se pudo devolver el lote");
        return;
      }
      toast.exito("Solicitudes devueltas para corrección");
      const idsDevueltos = new Set(seleccionadas);
      setPendientes((prev) => prev.filter((p) => !idsDevueltos.has(p.id)));
      setSeleccionadas(new Set());
      setConfirmandoLoteDevolver(false);
    } catch {
      setError("No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.");
      toast.error("No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setDevolviendoLote(false);
    }
  };

  const { filaActiva, setFilaActiva, alPresionar, contenedorRef } = useNavegacionFilas(pendientesPagina, (s) =>
    setIdAAprobar(s.id)
  );

  return (
    <div className="flex flex-col">
      <div className="flex-1 px-4 sm:px-8 py-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-baseline gap-2">
            <h1 className="text-lg sm:text-xl font-bold">Aprobaciones Pendientes</h1>
            <span className="hidden sm:inline text-xs text-neutral-500 dark:text-neutral-400">· Solicitudes de colaboradores esperando aprobación</span>
          </div>
          {seleccionadas.size > 0 && (
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => setConfirmandoLoteDevolver(true)}
                title="Devolver para corrección"
                className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs sm:text-sm font-medium text-neutral-500 dark:text-neutral-400 border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-700 dark:hover:text-neutral-200 px-3 py-2 rounded-lg transition"
              >
                <IconoDevolver className="w-4 h-4 shrink-0" /> Devolver ({seleccionadas.size})
              </button>
              <button
                onClick={() => setConfirmandoLote(true)}
                className="whitespace-nowrap text-xs sm:text-sm font-semibold bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg transition shadow-sm hover:shadow-md"
              >
                Aprobar ({seleccionadas.size})
              </button>
            </div>
          )}
        </div>

        {errorInicial && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{errorInicial}</div>
        )}

        {sinAsignaciones && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-xl px-4 py-3">
            Todavía no tienes ninguna Empresa/Sitio/Área asignada. Pide al Super Administrador que te
            asigne al menos una para poder ver solicitudes.
          </div>
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
              placeholder="Buscar por código, colaborador, ruta u observación..."
              className="w-full rounded-xl border border-neutral-300 bg-white text-neutral-900 pl-10 pr-4 py-2.5 text-sm placeholder-neutral-500 focus:border-orange-400 focus:ring-2 focus:ring-orange-500/15 outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
            />
          </div>
          <div className="w-full sm:w-60">
            <ComboboxBuscable
              opciones={[{ id: "", label: "Todos los supervisores" }, ...supervisoresOpciones]}
              value={supervisorId}
              onChange={cambiarSupervisor}
              placeholder="Todos los supervisores"
            />
          </div>
          <SelectorVista valor={vista} onCambiar={setVista} className="sm:ml-auto" />
        </div>

        {vista === "colaborador" ? (
          <div className="bg-neutral-50 dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 rounded-2xl overflow-hidden shadow-sm ring-1 ring-black/5 dark:ring-white/10">
          <TablaColaboradores
            filas={filasColaborador}
            cargarItems={(colaboradorId) => gruposColaborador.get(colaboradorId)?.solicitudes ?? []}
            clave={(s) => s.id}
            porPagina={POR_PAGINA}
            claveOrden="th-aprobaciones-colaborador"
            seleccion={{
              seleccionadas,
              alternar: alternarSeleccion,
              idsDe: (colaboradorId) => (gruposColaborador.get(colaboradorId)?.solicitudes ?? []).map((s) => s.id),
              alternarGrupo: alternarGrupoSeleccion,
            }}
            columnas={[
              { encabezado: "Código", render: (s) => <span className="font-mono">{s.codigo}</span> },
              { encabezado: "Fecha", render: (s) => formatearFecha(s.fecha) },
              { encabezado: "Ruta", render: (s) => s.rutaLabel },
              { encabezado: "Valor", render: (s) => formatearMoneda(s.montoTotal) },
            ]}
            acciones={(s) => (
              <div className="flex gap-1.5">
                <button
                  onClick={() => setIdAAprobar(s.id)}
                  className="text-xs font-medium text-white bg-green-600 hover:bg-green-700 px-3 py-1.5 rounded-full transition"
                >
                  Aprobar
                </button>
                <button
                  onClick={() => abrirModalDevolucion(s.id)}
                  title="Devolver para corrección"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-500 dark:text-neutral-400 border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-700 dark:hover:text-neutral-200 px-2.5 py-1.5 rounded-lg transition"
                >
                  <IconoDevolver className="w-3.5 h-3.5" /> Devolver
                </button>
              </div>
            )}
            vacio={
              busqueda
                ? "Sin resultados para esa búsqueda"
                : sinAsignaciones
                ? "Sin áreas asignadas"
                : "No hay solicitudes pendientes"
            }
          />
          </div>
        ) : (
        <div className="bg-neutral-50 dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 rounded-2xl overflow-hidden shadow-sm ring-1 ring-black/5 dark:ring-white/10">
          <div
            ref={contenedorRef}
            tabIndex={0}
            onKeyDown={alPresionar}
            className="overflow-x-auto outline-none"
          >
            <table className="w-full text-xs min-w-[720px]">
              <thead className="bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 text-left">
                <tr>
                  <th className="px-4 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={todasEnPaginaSeleccionadas}
                      onChange={alternarSeleccionarTodo}
                      className="w-4 h-4 accent-orange-500 rounded"
                    />
                  </th>
                  <EncabezadoOrdenable campo="codigo" ordenActivo={orden} onOrdenar={ordenar}>Código</EncabezadoOrdenable>
                  <EncabezadoOrdenable campo="fecha" ordenActivo={orden} onOrdenar={ordenar}>Fecha</EncabezadoOrdenable>
                  <EncabezadoOrdenable campo="nombreColaborador" ordenActivo={orden} onOrdenar={ordenar}>Colaborador</EncabezadoOrdenable>
                  <EncabezadoOrdenable campo="rutaLabel" ordenActivo={orden} onOrdenar={ordenar}>Ruta</EncabezadoOrdenable>
                  <EncabezadoOrdenable campo="montoTotal" ordenActivo={orden} onOrdenar={ordenar}>Valor</EncabezadoOrdenable>
                  <th className="px-4 py-3 font-medium">Observaciones</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {pendientesPagina.map((s, i) => (
                  <tr
                    key={s.id}
                    onClick={() => setFilaActiva(i)}
                    className={`border-t border-neutral-200/70 dark:border-neutral-800/70 hover:bg-neutral-100/60 dark:hover:bg-neutral-800/60 transition ${
                      i === filaActiva ? "bg-orange-50 dark:bg-orange-500/10" : ""
                    }`}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={seleccionadas.has(s.id)}
                        onChange={() => alternarSeleccion(s.id)}
                        className="w-4 h-4 accent-orange-500 rounded"
                      />
                    </td>
                    <td className="px-4 py-3 font-mono font-bold tracking-widest text-neutral-500 dark:text-neutral-400">{s.codigo}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{formatearFecha(s.fecha)}</p>
                      <p className="text-[11px] text-neutral-400 dark:text-neutral-500">
                        {new Date(s.fechaSolicitud).toLocaleTimeString("es-EC", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar nombre={s.nombreColaborador} indice={i} className="w-7 h-7 text-[11px]" />
                        <span>{s.nombreColaborador}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-neutral-600">{s.rutaLabel}</td>
                    <td className="px-4 py-3">{formatearMoneda(s.montoTotal)}</td>
                    <td className="px-4 py-3 text-neutral-500 dark:text-neutral-400 max-w-[220px] whitespace-normal break-words">
                      {s.observaciones || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => setIdAAprobar(s.id)}
                          className="text-xs font-medium text-white bg-green-600 hover:bg-green-700 px-3 py-1.5 rounded-full transition"
                        >
                          Aprobar
                        </button>
                        <button
                          onClick={() => abrirModalDevolucion(s.id)}
                          title="Devolver para corrección"
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-500 dark:text-neutral-400 border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-700 dark:hover:text-neutral-200 px-2.5 py-1.5 rounded-lg transition"
                        >
                          <IconoDevolver className="w-3.5 h-3.5" /> Devolver
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {pendientesFiltradas.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-10">
                      <EstadoVacio
                        mensaje={
                          busqueda
                            ? "Sin resultados para esa búsqueda"
                            : sinAsignaciones
                            ? "Sin áreas asignadas"
                            : "No hay solicitudes pendientes"
                        }
                        icono={
                          !busqueda && !sinAsignaciones ? (
                            <IconoCheck className="w-10 h-10 text-emerald-400 dark:text-emerald-500" />
                          ) : undefined
                        }
                      />
                    </td>
                  </tr>
                )}
              </tbody>

              {pendientesFiltradas.length > 0 && (
                <tfoot>
                  <tr className="border-t border-neutral-200 dark:border-neutral-800 bg-neutral-100/70 dark:bg-neutral-800/60 font-semibold">
                    <td className="px-4 py-3" colSpan={5}>
                      Total ({pendientesFiltradas.length} {pendientesFiltradas.length === 1 ? "solicitud" : "solicitudes"})
                    </td>
                    <td className="px-4 py-3">{formatearMoneda(totalGeneral)}</td>
                    <td colSpan={2}></td>
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

      <Modal abierto={!!idAAprobar} onCerrar={() => setIdAAprobar(null)} onConfirmar={confirmarAprobar} variante="centro" className="bg-white dark:bg-neutral-900 text-black dark:text-white rounded-3xl p-7 w-full max-w-xs text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-green-100 text-green-600 flex items-center justify-center mx-auto"><IconoCheck className="w-6 h-6" /></div>
            <p className="font-semibold text-neutral-900 dark:text-white">¿Aprobar esta solicitud?</p>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-2 justify-center pt-1">
              <button
                onClick={() => setIdAAprobar(null)}
                disabled={aprobando}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarAprobar}
                disabled={aprobando}
                className="flex-1 px-4 py-2.5 text-sm font-semibold bg-green-600 hover:bg-green-700 text-white rounded-xl disabled:opacity-50 transition flex items-center justify-center gap-2"
              >
                {aprobando && <Spinner className="w-4 h-4" />}
                {aprobando ? "Aprobando..." : "Aprobar"}
              </button>
            </div>
      </Modal>

      <Modal abierto={confirmandoLote} onCerrar={() => setConfirmandoLote(false)} onConfirmar={confirmarAprobarLote} variante="centro" className="bg-white dark:bg-neutral-900 text-black dark:text-white rounded-3xl p-7 w-full max-w-xs text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-green-100 text-green-600 flex items-center justify-center mx-auto"><IconoCheck className="w-6 h-6" /></div>
            <p className="font-semibold text-neutral-900 dark:text-white">¿Aprobar {seleccionadas.size} solicitudes?</p>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-2 justify-center pt-1">
              <button
                onClick={() => setConfirmandoLote(false)}
                disabled={aprobandoLote}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarAprobarLote}
                disabled={aprobandoLote}
                className="flex-1 px-4 py-2.5 text-sm font-semibold bg-green-600 hover:bg-green-700 text-white rounded-xl disabled:opacity-50 transition flex items-center justify-center gap-2"
              >
                {aprobandoLote && <Spinner className="w-4 h-4" />}
                {aprobandoLote ? "Aprobando..." : "Aprobar todas"}
              </button>
            </div>
      </Modal>

      <Modal abierto={confirmandoLoteDevolver} onCerrar={() => setConfirmandoLoteDevolver(false)} onConfirmar={confirmarDevolucionLote} variante="centro" className="bg-white dark:bg-neutral-900 text-black dark:text-white rounded-3xl p-7 w-full max-w-sm space-y-4 shadow-2xl">
            <div>
              <h2 className="font-semibold text-neutral-900 dark:text-white">Devolver {seleccionadas.size} solicitudes</h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                Todas siguen pendientes; cada colaborador verá esta misma nota y podrá corregir.
              </p>
            </div>
            <textarea
              value={comentarioLoteDevolver}
              onChange={(e) => setComentarioLoteDevolver(e.target.value.toUpperCase())}
              rows={3}
              autoFocus
              className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white px-3.5 py-3 text-sm focus:border-orange-400 focus:ring-2 focus:ring-orange-500/15 outline-none resize-none"
              placeholder="Ej: Ruta incorrecta para tu área, favor corregir..."
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-2 justify-end pt-1">
              <button
                onClick={() => setConfirmandoLoteDevolver(false)}
                disabled={devolviendoLote}
                className="px-4 py-2.5 text-sm font-medium text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarDevolucionLote}
                disabled={devolviendoLote}
                className="px-5 py-2.5 text-sm font-semibold bg-neutral-800 hover:bg-neutral-900 text-white rounded-xl disabled:opacity-50 transition flex items-center justify-center gap-2"
              >
                {devolviendoLote && <Spinner className="w-4 h-4" />}
                {devolviendoLote ? "Enviando..." : "Devolver todas"}
              </button>
            </div>
      </Modal>

      <Modal abierto={!!idADevolver} onCerrar={() => setIdADevolver(null)} onConfirmar={confirmarDevolucion} variante="centro" className="bg-white dark:bg-neutral-900 text-black dark:text-white rounded-3xl p-7 w-full max-w-sm space-y-4 shadow-2xl">
            <div>
              <h2 className="font-semibold text-neutral-900 dark:text-white">Devolver para corrección</h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                La solicitud sigue pendiente; el colaborador verá esta nota y podrá corregirla
              </p>
            </div>
            <textarea
              value={comentarioDevolucion}
              onChange={(e) => setComentarioDevolucion(e.target.value.toUpperCase())}
              rows={3}
              autoFocus
              className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white px-3.5 py-3 text-sm focus:border-orange-400 focus:ring-2 focus:ring-orange-500/15 outline-none resize-none"
              placeholder="Ej: Ruta incorrecta para tu área, favor corregir..."
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-2 justify-end pt-1">
              <button
                onClick={() => setIdADevolver(null)}
                disabled={devolviendo}
                className="px-4 py-2.5 text-sm font-medium text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarDevolucion}
                disabled={devolviendo}
                className="px-5 py-2.5 text-sm font-semibold bg-neutral-800 hover:bg-neutral-900 text-white rounded-xl disabled:opacity-50 transition flex items-center justify-center gap-2"
              >
                {devolviendo && <Spinner className="w-4 h-4" />}
                {devolviendo ? "Enviando..." : "Devolver"}
              </button>
            </div>
      </Modal>
    </div>
  );
}