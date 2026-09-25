// components/PanelAsignacionEquipo.tsx
// Pantalla dedicada de "Asignar equipo": a la izquierda se filtra y elige
// un supervisor, a la derecha se marca con checkboxes qué colaboradores de
// su área le reportan. Reemplaza el combo "Reporta a" enterrado en el
// modal de Colaboradores (que además no precargaba el valor actual).

"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFiltroEmpresaSitioArea } from "../lib/useFiltroEmpresaSitioArea";
import ComboboxBuscable from "./ComboboxBuscable";
import Paginacion from "./Paginacion";
import Modal from "./Modal";
import Spinner from "./Spinner";
import { useReportarCarga } from "../lib/cargaGlobal";
import { useToast } from "./Toast";
import EstadoVacio from "./EstadoVacio";
import Avatar from "./Avatar";
import { IconoLupa, IconoPregunta, IconoCheck, IconoX, IconoPersonas, IconoUsuarioDisponible } from "./Icons";
import BarraFiltros, { CampoEstadoActivo, CamposEmpresaSitioArea, chipEstadoActivo, chips, chipsEmpresaSitioArea, cumpleFiltroActivo, type FiltroActivo } from "./BarraFiltros";
import { useAccionesHeader } from "../lib/accionesHeader";

type Colaborador = {
  id: string;
  numero: number;
  nombreCompleto: string;
  codigoNomina: string | null;
  estado: string;
  esSupervisor: boolean;
  supervisorId: string | null;
  areaId: string;
  areaNombre: string;
  sitioId: string;
  empresaId: string;
};

type Opcion = { id: string; label: string };
type Sitio = { id: string; nombre: string; empresaId: string };
type Area = { id: string; nombre: string; sitioId: string; empresaId: string };

const POR_PAGINA = 15;

export default function PanelAsignacionEquipo() {
  const router = useRouter();
  const toast = useToast();

  // Se pide una sola vez al montar: esta pantalla necesita el listado
  // completo del alcance de TH para calcular equipos en el cliente (no
  // tiene sentido paginarlo en el servidor).
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [empresas, setEmpresas] = useState<Opcion[]>([]);
  const [sitios, setSitios] = useState<Sitio[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [sinAsignaciones, setSinAsignaciones] = useState(false);
  const [cargandoInicial, setCargandoInicial] = useState(true);
  const [errorInicial, setErrorInicial] = useState("");
  useReportarCarga(cargandoInicial);

  // Usada tanto por la carga inicial (abajo) como para refrescar después
  // de guardar cambios, sin depender de router.refresh() (esta pantalla ya
  // no tiene datos del servidor que refrescar).
  const cargarDatos = async () => {
    try {
      const res = await fetch("/api/th/colaboradores/asignacion-equipo");
      if (!res.ok) {
        setErrorInicial("No se pudo cargar la información. Intenta de nuevo.");
        return;
      }
      const data = await res.json();
      setColaboradores(data.colaboradores);
      setEmpresas(data.empresas);
      setSitios(data.sitios);
      setAreas(data.areas);
      setSinAsignaciones(data.sinAsignaciones);
      setErrorInicial("");
    } catch {
      setErrorInicial("No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.");
    }
  };

  useEffect(() => {
    let cancelado = false;
    fetch("/api/th/colaboradores/asignacion-equipo")
      .then(async (res) => {
        if (cancelado) return;
        if (!res.ok) {
          setErrorInicial("No se pudo cargar la información. Intenta de nuevo.");
          return;
        }
        const data = await res.json();
        setColaboradores(data.colaboradores);
        setEmpresas(data.empresas);
        setSitios(data.sitios);
        setAreas(data.areas);
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
  const [paginaActual, setPaginaActual] = useState(1);
  const resetPagina = () => setPaginaActual(1);

  const filtroUbicacion = useFiltroEmpresaSitioArea(sitios, areas, resetPagina);
  const { empresaFiltro, sitioFiltro, areaFiltro, cambiarEmpresaFiltro } = filtroUbicacion;

  const cambiarBusqueda = (v: string) => { setBusqueda(v); resetPagina(); };
  // Activos por defecto (a un inactivo no se le asigna nada), pero se
  // pueden ver los inactivos desde el panel de Filtros.
  const [estadoFiltro, setEstadoFiltro] = useState<FiltroActivo>("ACTIVO");
  const cambiarEstadoFiltro = (v: FiltroActivo) => { setEstadoFiltro(v); resetPagina(); };

  const supervisores = useMemo(() => colaboradores.filter((c) => c.esSupervisor), [colaboradores]);

  const supervisoresFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return supervisores.filter((c) => {
      if (!cumpleFiltroActivo(estadoFiltro, c.estado === "ACTIVO")) return false;
      if (empresaFiltro && c.empresaId !== empresaFiltro) return false;
      if (sitioFiltro && c.sitioId !== sitioFiltro) return false;
      if (areaFiltro && c.areaId !== areaFiltro) return false;
      if (!texto) return true;
      return (
        c.nombreCompleto.toLowerCase().includes(texto) ||
        (c.codigoNomina ?? "").toLowerCase().includes(texto)
      );
    });
  }, [supervisores, busqueda, estadoFiltro, empresaFiltro, sitioFiltro, areaFiltro]);

  const totalPaginas = Math.max(1, Math.ceil(supervisoresFiltrados.length / POR_PAGINA));
  const supervisoresPagina = useMemo(
    () => supervisoresFiltrados.slice((paginaActual - 1) * POR_PAGINA, paginaActual * POR_PAGINA),
    [supervisoresFiltrados, paginaActual]
  );

  const [supervisorSeleccionadoId, setSupervisorSeleccionadoId] = useState<string | null>(null);
  const [miembroIdsSeleccionados, setMiembroIdsSeleccionados] = useState<string[]>([]);
  const [busquedaMiembro, setBusquedaMiembro] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [confirmandoGuardar, setConfirmandoGuardar] = useState(false);

  const supervisorSeleccionado = colaboradores.find((c) => c.id === supervisorSeleccionadoId) ?? null;
  const nombrePorId = useMemo(() => new Map(colaboradores.map((c) => [c.id, c.nombreCompleto])), [colaboradores]);

  const equipoActual = (supervisor: Colaborador) =>
    colaboradores.filter((c) => c.supervisorId === supervisor.id).map((c) => c.id);

  // "Ver solo su equipo" (junto a Marcar todos/Ninguno): filtra la lista a
  // solo quienes YA le reportan al supervisor elegido, para encontrar rápido
  // a quién mover sin tener que buscar entre todo el área — sea uno solo
  // (cambio de área puntual) o el equipo completo de una vez.
  const [verSoloEquipo, setVerSoloEquipo] = useState(false);
  // "Disponibles" (junto a Marcar todos/Ninguno/Su equipo): filtra a solo
  // quienes NO tienen ningún supervisor todavía — para agregar gente nueva
  // sin tener que buscarla entre los que ya le reportan a otro (esos igual
  // se siguen viendo, en gris, con el resto de la lista sin este filtro).
  const [soloDisponibles, setSoloDisponibles] = useState(false);
  const [supervisorDestinoId, setSupervisorDestinoId] = useState("");
  const [confirmandoMover, setConfirmandoMover] = useState(false);
  const [moviendo, setMoviendo] = useState(false);
  const [errorMover, setErrorMover] = useState("");

  const seleccionarSupervisor = (c: Colaborador) => {
    setSupervisorSeleccionadoId(c.id);
    setMiembroIdsSeleccionados(equipoActual(c));
    setBusquedaMiembro("");
    setError("");
    setVerSoloEquipo(false);
    setSoloDisponibles(false);
    setSupervisorDestinoId("");
    setErrorMover("");
  };

  const candidatosDelArea = useMemo(
    () =>
      supervisorSeleccionado
        ? colaboradores.filter((c) => c.areaId === supervisorSeleccionado.areaId && c.id !== supervisorSeleccionado.id)
        : [],
    [colaboradores, supervisorSeleccionado]
  );

  const candidatosVisibles = useMemo(() => {
    const texto = busquedaMiembro.trim().toLowerCase();
    let base = candidatosDelArea;
    if (verSoloEquipo && supervisorSeleccionado) {
      base = base.filter((c) => c.supervisorId === supervisorSeleccionado.id);
    } else if (soloDisponibles) {
      base = base.filter((c) => !c.supervisorId);
    }
    if (!texto) return base;
    return base.filter(
      (c) => c.nombreCompleto.toLowerCase().includes(texto) || (c.codigoNomina ?? "").toLowerCase().includes(texto)
    );
  }, [candidatosDelArea, busquedaMiembro, verSoloEquipo, soloDisponibles, supervisorSeleccionado]);

  const alternarMiembro = (id: string) => {
    setMiembroIdsSeleccionados((prev) => (prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]));
  };

  // Mismo criterio que "deshabilitado" en cada fila (más abajo, en el
  // render): fuera de "Ver solo su equipo", a quien ya reporta a OTRO
  // supervisor no se lo toca desde acá (tiene su propio flujo, "Su
  // equipo" + Mover). "Todos" tiene que respetar esto también — si no,
  // terminaba marcando (y al guardar, robándole a otro supervisor) gente
  // que ni siquiera se podía tildar a mano una por una.
  const puedeMarcarse = (c: Colaborador) =>
    verSoloEquipo || !c.supervisorId || c.supervisorId === supervisorSeleccionado?.id;

  // Actúa sobre lo BUSCADO/filtrado en pantalla (candidatosVisibles) y
  // suma/resta sobre la selección existente en vez de reemplazarla — mismo
  // criterio que "Marcar todas" en Asignar rutas.
  const marcarTodos = () => {
    const idsVisibles = candidatosVisibles.filter(puedeMarcarse).map((c) => c.id);
    setMiembroIdsSeleccionados((prev) => Array.from(new Set([...prev, ...idsVisibles])));
  };
  const desmarcarTodos = () => {
    const idsVisibles = new Set(candidatosVisibles.map((c) => c.id));
    setMiembroIdsSeleccionados((prev) => prev.filter((id) => !idsVisibles.has(id)));
  };

  // Se recalcula contra candidatosDelArea — TODA el área, no solo lo que
  // esté visible con la búsqueda/filtro puestos en este momento — así el
  // modal de confirmación de abajo nunca deja afuera un cambio hecho
  // mientras se estaba buscando otra cosa.
  const cambiosPendientes = useMemo(() => {
    if (!supervisorSeleccionado) return [];
    const equipoAntes = new Set(equipoActual(supervisorSeleccionado));
    const equipoAhora = new Set(miembroIdsSeleccionados);
    const cambios: { id: string; nombreCompleto: string; tipo: "agregado" | "quitado" }[] = [];
    for (const c of candidatosDelArea) {
      const antes = equipoAntes.has(c.id);
      const ahora = equipoAhora.has(c.id);
      if (antes !== ahora) cambios.push({ id: c.id, nombreCompleto: c.nombreCompleto, tipo: ahora ? "agregado" : "quitado" });
    }
    return cambios;
  }, [supervisorSeleccionado, miembroIdsSeleccionados, candidatosDelArea, colaboradores]); // eslint-disable-line react-hooks/exhaustive-deps

  const hayCambios = cambiosPendientes.length > 0;

  const guardar = async () => {
    if (!supervisorSeleccionado || cambiosPendientes.length === 0) return;
    setGuardando(true);
    setError("");

    try {
      const resultados = await Promise.all(
        cambiosPendientes.map((cambio) =>
          fetch(`/api/colaboradores/${cambio.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ supervisorId: cambio.tipo === "agregado" ? supervisorSeleccionado.id : null }),
          })
        )
      );
      const fallo = resultados.find((r) => !r.ok);
      if (fallo) {
        const data = await fallo.json().catch(() => ({}));
        setError(data.error ?? "No se pudieron guardar todos los cambios");
        toast.error(data.error ?? "No se pudieron guardar todos los cambios");
        return;
      }
      toast.exito("Equipo actualizado");
      setConfirmandoGuardar(false);
      await cargarDatos();
    } catch {
      setError("No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.");
      toast.error("No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setGuardando(false);
    }
  };

  // ---------- Mover a otro supervisor (solo con "Ver solo su equipo") ----------
  const supervisoresDestino = useMemo(
    () =>
      supervisorSeleccionado
        ? supervisores.filter((s) => s.areaId === supervisorSeleccionado.areaId && s.id !== supervisorSeleccionado.id)
        : [],
    [supervisores, supervisorSeleccionado]
  );

  // Con el filtro activo, todo lo visible ya es su equipo actual: lo
  // marcado (por defecto, todos) es lo que se va a mover.
  const paraMover = useMemo(
    () => candidatosVisibles.filter((c) => miembroIdsSeleccionados.includes(c.id)),
    [candidatosVisibles, miembroIdsSeleccionados]
  );

  const confirmarMover = async () => {
    if (!supervisorDestinoId || paraMover.length === 0) return;
    setMoviendo(true);
    setErrorMover("");
    try {
      const resultados = await Promise.all(
        paraMover.map((c) =>
          fetch(`/api/colaboradores/${c.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ supervisorId: supervisorDestinoId }),
          })
        )
      );
      const fallo = resultados.find((r) => !r.ok);
      if (fallo) {
        const data = await fallo.json().catch(() => ({}));
        setErrorMover(data.error ?? "No se pudieron mover todos");
        toast.error(data.error ?? "No se pudieron mover todos los colaboradores");
        return;
      }
      toast.exito(`${paraMover.length} colaborador${paraMover.length === 1 ? "" : "es"} movido${paraMover.length === 1 ? "" : "s"}`);
      setConfirmandoMover(false);
      setVerSoloEquipo(false);
      setSupervisorDestinoId("");
      // Sin esto, quedaban en miembroIdsSeleccionados (quedó armado con el
      // equipo ANTES de mover) — al volver a la vista normal, cambiosPendientes
      // los veía "marcados" pero ya no en equipoActual(), y los mostraba como
      // si hubiera que volver a agregarlos a este mismo supervisor: alguien
      // que recién se movió podía reaparecer como cambio pendiente fantasma.
      const idsMovidos = new Set(paraMover.map((c) => c.id));
      setMiembroIdsSeleccionados((prev) => prev.filter((id) => !idsMovidos.has(id)));
      await cargarDatos();
    } catch {
      setErrorMover("No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.");
      toast.error("No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setMoviendo(false);
    }
  };

  useAccionesHeader(
    <button
      onClick={() => router.push("/th/colaboradores?nuevo=1")}
      className="text-xs sm:text-sm font-semibold bg-orange-500 hover:bg-orange-600 text-black px-3 py-2 rounded-lg transition shadow-sm hover:shadow-md hover:-translate-y-0.5 shrink-0"
    >
      + Nuevo colaborador
    </button>
  );

  return (
    <div className="flex-1 px-4 sm:px-8 pb-5 space-y-4">
      {errorInicial && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{errorInicial}</div>
      )}

      {!cargandoInicial && (
        <>
          {sinAsignaciones && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-xl px-4 py-3">
              No tienes ninguna Empresa/Sitio/Área asignada todavía.
            </div>
          )}

          {!sinAsignaciones && supervisores.length === 0 && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-xl px-4 py-3">
              Todavía no hay ningún colaborador marcado como Supervisor. Marcalo desde la pantalla de Colaboradores.
            </div>
          )}

      <div className="flex flex-col lg:flex-row gap-4 items-start">
        {/* Columna izquierda: filtros + lista de supervisores */}
        <div className="w-full lg:w-[380px] shrink-0 space-y-3">
          <BarraFiltros
            busqueda={{ valor: busqueda, onCambiar: cambiarBusqueda, placeholder: "Buscar...", ayuda: "Busca supervisor por nombre o código" }}
            chips={chips(
              chipEstadoActivo(estadoFiltro, () => cambiarEstadoFiltro("ACTIVO")),
              ...chipsEmpresaSitioArea(empresas, filtroUbicacion)
            )}
            onLimpiar={() => { cambiarEmpresaFiltro(""); cambiarEstadoFiltro("ACTIVO"); }}
            resultados={supervisoresFiltrados.length}
          >
            <CampoEstadoActivo valor={estadoFiltro} onCambiar={cambiarEstadoFiltro} />
            <CamposEmpresaSitioArea empresas={empresas} filtro={filtroUbicacion} />
          </BarraFiltros>

          <div className="bg-neutral-50 dark:bg-neutral-900 rounded-2xl overflow-hidden shadow-sm ring-1 ring-black/5 dark:ring-white/10">
            <div className="max-h-[480px] overflow-y-auto divide-y divide-neutral-200/70">
              {supervisoresPagina.map((c, i) => {
                const activo = c.id === supervisorSeleccionadoId;
                const cantidad = equipoActual(c).length;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => seleccionarSupervisor(c)}
                    className={`w-full text-left px-4 py-2.5 transition ${
                      activo ? "bg-orange-50 dark:bg-orange-500/10" : "hover:bg-neutral-100/60 dark:hover:bg-neutral-800/60"
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <Avatar nombre={c.nombreCompleto} indice={i} className="w-7 h-7 text-[11px] mt-0.5" />
                      <div className="min-w-0">
                        <p className={`text-xs font-medium truncate ${activo ? "text-orange-700" : "text-neutral-800 dark:text-neutral-200"}`}>
                          {c.nombreCompleto}
                        </p>
                        <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                          {c.codigoNomina ?? "Sin código"} · {c.areaNombre}
                        </p>
                        <p className="text-[10px] font-semibold mt-0.5 text-neutral-400 dark:text-neutral-500">
                          {cantidad} persona{cantidad === 1 ? "" : "s"} a cargo
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
              {supervisoresFiltrados.length === 0 && (
                <div className="px-4 py-10">
                  <EstadoVacio
                    mensaje={
                      busqueda || empresaFiltro || sitioFiltro || areaFiltro
                        ? "Sin resultados para esos filtros"
                        : "No hay supervisores registrados"
                    }
                  />
                </div>
              )}
            </div>
            <Paginacion paginaActual={paginaActual} totalPaginas={totalPaginas} onCambiarPagina={setPaginaActual} />
          </div>
        </div>

        {/* Columna derecha: equipo del supervisor seleccionado */}
        <div className="flex-1 min-w-0 w-full bg-neutral-50 dark:bg-neutral-900 rounded-2xl shadow-sm ring-1 ring-black/5 dark:ring-white/10 p-5">
          {!supervisorSeleccionado ? (
            <div className="py-16 text-center text-sm text-neutral-400 dark:text-neutral-500">
              Elegir un supervisor de la lista para armar su equipo
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-bold text-neutral-900 dark:text-white">{supervisorSeleccionado.nombreCompleto}</h2>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">{supervisorSeleccionado.areaNombre}</p>
              </div>

              <div className="space-y-2">
                <div className="relative">
                  <IconoLupa className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 dark:text-neutral-500 pointer-events-none" />
                  <input
                    value={busquedaMiembro}
                    onChange={(e) => setBusquedaMiembro(e.target.value)}
                    placeholder="Buscar..."
                    title="Busca colaborador"
                    className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white pl-10 pr-3.5 py-2.5 text-sm placeholder-neutral-400 focus:border-orange-400 focus:ring-2 focus:ring-orange-500/15 outline-none"
                  />
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={marcarTodos}
                    title="Marcar todos los que se ven en la lista"
                    className="flex items-center gap-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-300 border border-neutral-300 dark:border-neutral-700 px-3 py-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
                  >
                    <IconoCheck className="w-3.5 h-3.5" /> Todos
                  </button>
                  <button
                    type="button"
                    onClick={desmarcarTodos}
                    title="Desmarcar todos los que se ven en la lista"
                    className="flex items-center gap-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-300 border border-neutral-300 dark:border-neutral-700 px-3 py-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
                  >
                    <IconoX className="w-3.5 h-3.5" /> Ninguno
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setVerSoloEquipo((v) => !v);
                      setSoloDisponibles(false);
                      setMiembroIdsSeleccionados(equipoActual(supervisorSeleccionado));
                      setSupervisorDestinoId("");
                      setErrorMover("");
                    }}
                    title="Ver solo a quienes ya le reportan, para moverlos a otro supervisor"
                    className={`flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg border transition ${
                      verSoloEquipo
                        ? "bg-orange-500 border-orange-500 text-white hover:bg-orange-600"
                        : "text-neutral-600 dark:text-neutral-300 border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                    }`}
                  >
                    <IconoPersonas className="w-3.5 h-3.5" /> {verSoloEquipo ? "Viendo su equipo" : "Su equipo"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSoloDisponibles((v) => !v);
                      setVerSoloEquipo(false);
                    }}
                    title="Ver solo a quienes no tienen ningún supervisor todavía"
                    className={`flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg border transition ${
                      soloDisponibles
                        ? "bg-orange-500 border-orange-500 text-white hover:bg-orange-600"
                        : "text-neutral-600 dark:text-neutral-300 border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                    }`}
                  >
                    <IconoUsuarioDisponible className="w-3.5 h-3.5" /> Disponibles
                  </button>
                </div>
              </div>

              {verSoloEquipo && (
                <div className="bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20 rounded-xl p-3.5 space-y-2.5">
                  <p className="text-xs text-orange-800 dark:text-orange-300">
                    Marcar a quién mover (por defecto está todo el equipo) y elegir el supervisor destino.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="flex-1">
                      <ComboboxBuscable
                        opciones={supervisoresDestino.map((s) => ({ id: s.id, label: s.nombreCompleto }))}
                        value={supervisorDestinoId}
                        onChange={setSupervisorDestinoId}
                        placeholder="Mover a..."
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setConfirmandoMover(true)}
                      disabled={!supervisorDestinoId || paraMover.length === 0}
                      className="px-4 py-2.5 text-sm font-semibold bg-orange-500 hover:bg-orange-600 text-white rounded-xl disabled:opacity-50 transition shrink-0"
                    >
                      Mover ({paraMover.length})
                    </button>
                  </div>
                </div>
              )}

              <div className="bg-white dark:bg-neutral-900 rounded-xl ring-1 ring-black/5 dark:ring-white/10 overflow-hidden">
                <div className="max-h-[380px] overflow-y-auto divide-y divide-neutral-100">
                  {candidatosVisibles.map((c) => {
                    const marcado = miembroIdsSeleccionados.includes(c.id);
                    const tieneOtroSupervisor = !!c.supervisorId && c.supervisorId !== supervisorSeleccionado.id;
                    // Fuera de "Ver solo su equipo" esta lista es para
                    // agregar/quitar gente sin supervisor a este equipo — a
                    // quien ya le reporta a otro no se lo toca desde acá
                    // (eso tiene su propio flujo explícito), pero se sigue
                    // mostrando igual, en gris, para que quede claro que
                    // existe y dónde está — "Disponibles" filtra a quienes
                    // no tienen ninguno todavía, si se quiere evitarlos.
                    const deshabilitado = !puedeMarcarse(c);
                    return (
                      <label
                        key={c.id}
                        className={`flex items-center gap-3 px-4 py-3 text-sm transition ${
                          deshabilitado
                            ? "opacity-50 cursor-not-allowed"
                            : "cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/60"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={marcado}
                          disabled={deshabilitado}
                          onChange={() => alternarMiembro(c.id)}
                          className="w-4 h-4 accent-orange-500 rounded shrink-0"
                        />
                        <span className="flex-1 min-w-0">
                          <span className="text-neutral-800 dark:text-neutral-200">{c.nombreCompleto}</span>
                          {c.esSupervisor && (
                            <span className="ml-1.5 text-[10px] font-semibold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-500/10 px-1.5 py-0.5 rounded">
                              SUPERVISOR
                            </span>
                          )}
                          {tieneOtroSupervisor && !verSoloEquipo && (
                            <span className="block text-[11px] text-neutral-400 dark:text-neutral-500">
                              Reporta a {nombrePorId.get(c.supervisorId!) ?? "otro supervisor"} — usá &quot;Su equipo&quot; desde ahí para moverlo
                            </span>
                          )}
                        </span>
                        <span className="text-neutral-400 dark:text-neutral-500 text-xs shrink-0">{c.codigoNomina ?? "—"}</span>
                      </label>
                    );
                  })}
                  {candidatosVisibles.length === 0 && (
                    <div className="px-4 py-10">
                      <EstadoVacio
                        mensaje={
                          verSoloEquipo
                            ? "Este supervisor no tiene colaboradores en su equipo"
                            : candidatosDelArea.length === 0
                              ? "No hay más colaboradores en esta área"
                              : soloDisponibles
                                ? "Todos los colaboradores de esta área ya tienen otro supervisor"
                                : "Sin resultados para esa búsqueda"
                        }
                      />
                    </div>
                  )}
                </div>
              </div>

              {!verSoloEquipo && (
                <p className="text-xs text-neutral-400 dark:text-neutral-500">
                  {miembroIdsSeleccionados.length} de {candidatosDelArea.length} colaboradores de su área le reportan a{" "}
                  {supervisorSeleccionado.nombreCompleto.split(" ")[0]}.
                </p>
              )}

              {error && <p className="text-sm text-red-600">{error}</p>}

              {!verSoloEquipo && (
                <div className="flex justify-end">
                  <button
                    onClick={() => { setError(""); setConfirmandoGuardar(true); }}
                    disabled={guardando || !hayCambios}
                    className="px-5 py-2.5 text-sm font-semibold bg-orange-500 hover:bg-orange-600 text-white rounded-xl disabled:opacity-50 transition"
                  >
                    Guardar cambios{hayCambios ? ` (${cambiosPendientes.length})` : ""}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
        </>
      )}

      <Modal
        abierto={confirmandoMover}
        onCerrar={() => setConfirmandoMover(false)}
        onConfirmar={confirmarMover}
        variante="centro"
        className="bg-white dark:bg-neutral-900 text-black dark:text-white rounded-3xl p-7 w-full max-w-sm text-center space-y-4 shadow-2xl"
      >
        <div className="w-12 h-12 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center mx-auto">
          <IconoPregunta className="w-6 h-6" />
        </div>
        <p className="font-semibold text-neutral-900 dark:text-white">
          ¿Mover {paraMover.length} {paraMover.length === 1 ? "colaborador" : "colaboradores"} a{" "}
          {supervisoresDestino.find((s) => s.id === supervisorDestinoId)?.nombreCompleto ?? "el destino elegido"}?
        </p>
        <div className="text-sm text-neutral-500 dark:text-neutral-400 text-left space-y-1 max-h-48 overflow-y-auto">
          {paraMover.map((c) => (
            <p key={c.id}>
              <span className="text-neutral-700 dark:text-neutral-300">{c.nombreCompleto}</span> — deja de reportarle a{" "}
              {supervisorSeleccionado?.nombreCompleto}
            </p>
          ))}
        </div>
        {errorMover && <p className="text-sm text-red-600">{errorMover}</p>}
        <div className="flex gap-2 justify-center pt-1">
          <button
            onClick={() => setConfirmandoMover(false)}
            disabled={moviendo}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
          >
            Cancelar
          </button>
          <button
            onClick={confirmarMover}
            disabled={moviendo}
            className="flex-1 px-4 py-2.5 text-sm font-semibold bg-orange-500 hover:bg-orange-600 text-white rounded-xl disabled:opacity-50 transition flex items-center justify-center gap-2"
          >
            {moviendo && <Spinner className="w-4 h-4" />}
            {moviendo ? "Moviendo..." : "Sí, mover"}
          </button>
        </div>
      </Modal>

      <Modal
        abierto={confirmandoGuardar}
        onCerrar={() => setConfirmandoGuardar(false)}
        onConfirmar={guardar}
        variante="centro"
        className="bg-white dark:bg-neutral-900 text-black dark:text-white rounded-3xl p-7 w-full max-w-sm text-center space-y-4 shadow-2xl"
      >
        <div className="w-12 h-12 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center mx-auto">
          <IconoPregunta className="w-6 h-6" />
        </div>
        <p className="font-semibold text-neutral-900 dark:text-white">
          ¿Confirmar {cambiosPendientes.length} cambio{cambiosPendientes.length === 1 ? "" : "s"} en el equipo de{" "}
          {supervisorSeleccionado?.nombreCompleto}?
        </p>
        <div className="text-sm text-neutral-500 dark:text-neutral-400 text-left space-y-1 max-h-48 overflow-y-auto">
          {cambiosPendientes.map((c) => (
            <p key={c.id}>
              <span className={c.tipo === "agregado" ? "text-green-600 dark:text-green-400 font-semibold" : "text-red-600 dark:text-red-400 font-semibold"}>
                {c.tipo === "agregado" ? "+" : "−"}
              </span>{" "}
              <span className="text-neutral-700 dark:text-neutral-300">{c.nombreCompleto}</span>{" "}
              {c.tipo === "agregado" ? "se agrega al equipo" : "deja el equipo"}
            </p>
          ))}
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-2 justify-center pt-1">
          <button
            onClick={() => setConfirmandoGuardar(false)}
            disabled={guardando}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
          >
            Cancelar
          </button>
          <button
            onClick={guardar}
            disabled={guardando}
            className="flex-1 px-4 py-2.5 text-sm font-semibold bg-orange-500 hover:bg-orange-600 text-white rounded-xl disabled:opacity-50 transition flex items-center justify-center gap-2"
          >
            {guardando && <Spinner className="w-4 h-4" />}
            {guardando ? "Guardando..." : "Sí, guardar"}
          </button>
        </div>
      </Modal>
    </div>
  );
}
