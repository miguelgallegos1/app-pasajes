// components/PanelColaboradoresTH.tsx
// CRUD de Colaboradores: crear, editar (con Estado incluido), buscador,
// switch "Solo activos" (encendido por defecto), paginación, y modal
// de "Gestionar" (Desactivar/Reactivar + Eliminar permanente).

"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import ComboboxBuscable from "./ComboboxBuscable";
import ToggleSwitch from "./ToggleSwitch";
import Paginacion from "./Paginacion";
import EncabezadoOrdenable from "./EncabezadoOrdenable";
import Modal from "./Modal";
import Spinner from "./Spinner";
import { IconoCopiar, IconoAlerta, IconoCheck, IconoRefrescar, IconoLupa } from "./Icons";
import EstadoVacio from "./EstadoVacio";
import Avatar from "./Avatar";
import MenuAcciones from "./MenuAcciones";
import { useToast } from "./Toast";
import { useOrdenTabla } from "../lib/useOrdenTabla";
import { useFiltroEmpresaSitioArea } from "../lib/useFiltroEmpresaSitioArea";

type Colaborador = {
  id: string;
  numero: number;
  nombreCompleto: string;
  apellidos: string;
  nombres: string;
  codigoNomina: string | null;
  estado: string;
  esSupervisor: boolean;
  supervisorNombre: string | null;
  empresaId: string;
  sitioId: string;
  areaId: string;
  areaLabel: string;
  tieneSolicitudes: boolean;
};

type CampoOrden = "numero" | "codigoNomina" | "nombreCompleto" | "supervisorNombre" | "estado";
const VALOR_ORDEN: Record<CampoOrden, (c: Colaborador) => string | number> = {
  numero: (c) => c.numero,
  codigoNomina: (c) => c.codigoNomina ?? "",
  nombreCompleto: (c) => c.nombreCompleto,
  supervisorNombre: (c) => c.supervisorNombre ?? "",
  estado: (c) => c.estado,
};

type Opcion = { id: string; label: string };
type Sitio = { id: string; nombre: string; empresaId: string };
type Area = { id: string; nombre: string; sitioId: string };

const POR_PAGINA = 10;

export default function PanelColaboradoresTH() {
  const toast = useToast();

  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [areasDisponibles, setAreasDisponibles] = useState<Opcion[]>([]);
  const [empresas, setEmpresas] = useState<Opcion[]>([]);
  const [sitios, setSitios] = useState<Sitio[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [sinAsignaciones, setSinAsignaciones] = useState(false);
  const [cargandoInicial, setCargandoInicial] = useState(true);
  const [errorInicial, setErrorInicial] = useState("");

  const cargarDatos = async () => {
    try {
      const res = await fetch("/api/th/colaboradores/datos");
      if (!res.ok) {
        setErrorInicial("No se pudo cargar la información. Intenta de nuevo.");
        return;
      }
      const data = await res.json();
      setColaboradores(data.colaboradores);
      setAreasDisponibles(data.areasDisponibles);
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
    fetch("/api/th/colaboradores/datos")
      .then(async (res) => {
        if (cancelado) return;
        if (!res.ok) {
          setErrorInicial("No se pudo cargar la información. Intenta de nuevo.");
          return;
        }
        const data = await res.json();
        setColaboradores(data.colaboradores);
        setAreasDisponibles(data.areasDisponibles);
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

  // Precarga la búsqueda si se llegó desde la paleta de comandos con un
  // resultado de colaborador (?q=...) — lectura directa del DOM, no
  // useSearchParams, para no forzar un límite de Suspense en la página.
  const [busqueda, setBusqueda] = useState(() =>
    typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get("q") ?? ""
  );
  const [soloActivos, setSoloActivos] = useState(true); // arranca mostrando solo Activos
  const [paginaActual, setPaginaActual] = useState(1);
  const resetPagina = () => setPaginaActual(1);

  const {
    empresaFiltro,
    sitioFiltro,
    areaFiltro,
    sitiosFiltro,
    areasFiltro,
    cambiarEmpresaFiltro,
    cambiarSitioFiltro,
    cambiarAreaFiltro,
  } = useFiltroEmpresaSitioArea(sitios, areas, resetPagina);

  const colaboradoresFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return colaboradores.filter((c) => {
      if (soloActivos && c.estado !== "ACTIVO") return false;
      if (empresaFiltro && c.empresaId !== empresaFiltro) return false;
      if (sitioFiltro && c.sitioId !== sitioFiltro) return false;
      if (areaFiltro && c.areaId !== areaFiltro) return false;
      if (!texto) return true;
      return (
        c.nombreCompleto.toLowerCase().includes(texto) ||
        c.areaLabel.toLowerCase().includes(texto) ||
        (c.codigoNomina ?? "").toLowerCase().includes(texto)
      );
    });
  }, [colaboradores, busqueda, soloActivos, empresaFiltro, sitioFiltro, areaFiltro]);

  const { orden, ordenar, itemsOrdenados: colaboradoresOrdenados } = useOrdenTabla<Colaborador, CampoOrden>(
    colaboradoresFiltrados,
    (c, campo) => VALOR_ORDEN[campo](c),
    "th-colaboradores"
  );

  const totalPaginas = Math.max(1, Math.ceil(colaboradoresOrdenados.length / POR_PAGINA));
  const colaboradoresPagina = useMemo(
    () => colaboradoresOrdenados.slice((paginaActual - 1) * POR_PAGINA, paginaActual * POR_PAGINA),
    [colaboradoresOrdenados, paginaActual]
  );

  const cambiarBusqueda = (valor: string) => {
    setBusqueda(valor);
    setPaginaActual(1);
  };

  const cambiarSoloActivos = (valor: boolean) => {
    setSoloActivos(valor);
    setPaginaActual(1);
  };

  const [modalAbierto, setModalAbierto] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [apellidos, setApellidos] = useState("");
  const [nombres, setNombres] = useState("");
  const [codigoNomina, setCodigoNomina] = useState("");
  const [areaId, setAreaId] = useState("");
  const [pin, setPin] = useState("");
  const [generandoPin, setGenerandoPin] = useState(false);
  const [pinCopiado, setPinCopiado] = useState(false);
  const [reseteandoPin, setReseteandoPin] = useState(false);
  const [confirmandoResetPin, setConfirmandoResetPin] = useState(false);
  const [esSupervisor, setEsSupervisor] = useState(false);
  const [estadoEdicion, setEstadoEdicion] = useState("ACTIVO");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  const [idGestionar, setIdGestionar] = useState<string | null>(null);
  const [procesando, setProcesando] = useState(false);
  const [errorGestion, setErrorGestion] = useState("");
  const [confirmandoEliminar, setConfirmandoEliminar] = useState(false);

  // Evita que una respuesta fuera de orden (Resetear -> Cancelar ->
  // Resetear de nuevo, muy seguido) termine mostrando un PIN de una
  // petición vieja como si fuera el actual.
  const peticionPinRef = useRef(0);

  const generarPin = async () => {
    const idPeticion = ++peticionPinRef.current;
    setGenerandoPin(true);
    setPinCopiado(false);
    try {
      const res = await fetch("/api/auth/generar-pin", { method: "POST" });
      if (idPeticion !== peticionPinRef.current) return;
      if (res.ok) {
        const data = await res.json();
        setPin(data.pin);
      } else {
        toast.error("No se pudo generar un PIN, intenta de nuevo");
      }
    } catch {
      if (idPeticion === peticionPinRef.current) {
        toast.error("No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.");
      }
    } finally {
      if (idPeticion === peticionPinRef.current) setGenerandoPin(false);
    }
  };

  const copiarPin = async () => {
    try {
      await navigator.clipboard.writeText(pin);
      setPinCopiado(true);
      setTimeout(() => setPinCopiado(false), 2000);
    } catch {
      toast.error("No se pudo copiar, cópialo manualmente");
    }
  };

  const abrirCrear = () => {
    setEditandoId(null);
    setApellidos("");
    setNombres("");
    setCodigoNomina("");
    setAreaId("");
    setPin("");
    setEsSupervisor(false);
    setEstadoEdicion("ACTIVO");
    setError("");
    setModalAbierto(true);
    generarPin();
  };

  // Llegar desde "+ Nuevo colaborador" en Asignar equipo trae ?nuevo=1 —
  // abre el modal de creación de una, sin tener que buscar el botón acá.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (new URLSearchParams(window.location.search).get("nuevo") !== "1") return;
    (async () => {
      abrirCrear();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const abrirEditar = (c: Colaborador) => {
    setEditandoId(c.id);
    setApellidos(c.apellidos);
    setNombres(c.nombres);
    setCodigoNomina(c.codigoNomina ?? "");
    setAreaId(c.areaId);
    setPin("");
    setReseteandoPin(false);
    setConfirmandoResetPin(false);
    setEsSupervisor(c.esSupervisor);
    setEstadoEdicion(c.estado);
    setError("");
    setModalAbierto(true);
  };

  const guardar = async () => {
    if (!apellidos.trim() || !nombres.trim() || !codigoNomina.trim() || !areaId) {
      setError("Apellidos, Nombres, Código de nómina y Área son obligatorios");
      return;
    }
    if ((!editandoId || reseteandoPin) && !/^\d{6}$/.test(pin)) {
      setError("El PIN debe tener exactamente 6 dígitos");
      return;
    }

    setGuardando(true);
    setError("");

    const url = editandoId ? `/api/colaboradores/${editandoId}` : "/api/colaboradores";
    const method = editandoId ? "PATCH" : "POST";
    const body = editandoId
      ? {
          apellidos,
          nombres,
          codigoNomina,
          areaId,
          esSupervisor,
          estado: estadoEdicion,
          ...(reseteandoPin ? { pin } : {}),
        }
      : { apellidos, nombres, codigoNomina, areaId, pin, esSupervisor };

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "No se pudo guardar");
        toast.error(data.error ?? "No se pudo guardar el colaborador");
        return;
      }
      setModalAbierto(false);
      toast.exito(
        editandoId ? (reseteandoPin ? "Colaborador actualizado y PIN reseteado" : "Colaborador actualizado") : "Colaborador creado"
      );
      await cargarDatos();
    } catch {
      setError("No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.");
      toast.error("No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setGuardando(false);
    }
  };

  const colaboradorGestionar = colaboradores.find((c) => c.id === idGestionar);

  const cambiarEstado = async (nuevoEstado: "ACTIVO" | "INACTIVO") => {
    if (!idGestionar) return;
    setProcesando(true);
    setErrorGestion("");
    try {
      const res = await fetch(`/api/colaboradores/${idGestionar}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: nuevoEstado }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErrorGestion(data.error ?? "No se pudo actualizar");
        toast.error(data.error ?? "No se pudo actualizar el colaborador");
        return;
      }
      setIdGestionar(null);
      toast.exito(nuevoEstado === "ACTIVO" ? "Colaborador reactivado" : "Colaborador desactivado");
      await cargarDatos();
    } catch {
      setErrorGestion("No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.");
      toast.error("No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setProcesando(false);
    }
  };

  const eliminarPermanente = async () => {
    if (!idGestionar) return;
    setProcesando(true);
    setErrorGestion("");
    try {
      const res = await fetch(`/api/colaboradores/${idGestionar}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErrorGestion(data.error ?? "No se pudo eliminar");
        toast.error(data.error ?? "No se pudo eliminar el colaborador");
        return;
      }
      setIdGestionar(null);
      setConfirmandoEliminar(false);
      toast.exito("Colaborador eliminado");
      await cargarDatos();
    } catch {
      setErrorGestion("No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.");
      toast.error("No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setProcesando(false);
    }
  };

  return (
    <div className="flex-1 px-4 sm:px-8 py-5 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-wrap items-baseline gap-2">
          <h1 className="text-lg sm:text-xl font-bold">Colaboradores</h1>
          <span className="hidden sm:inline text-xs text-neutral-500 dark:text-neutral-400">· Crea y administra los colaboradores de tu Empresa/Sitio/Área</span>
        </div>
        <button
          onClick={abrirCrear}
          disabled={sinAsignaciones}
          className="text-xs sm:text-sm font-semibold bg-orange-500 hover:bg-orange-600 text-black px-3 py-2 rounded-lg transition shadow-sm hover:shadow-md hover:-translate-y-0.5 disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:shadow-sm"
        >
          + Nuevo colaborador
        </button>
      </div>

      {errorInicial && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{errorInicial}</div>
      )}

      {sinAsignaciones && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-xl px-4 py-3">
          No tienes ninguna Empresa/Sitio/Área asignada todavía.
        </div>
      )}

      {cargandoInicial ? (
        <div className="flex items-center justify-center gap-2.5 py-24 text-sm text-neutral-400 dark:text-neutral-500">
          <Spinner className="w-4 h-4" /> Cargando...
        </div>
      ) : (
      <>
      {/* Barra de filtros: buscador + switch + Empresa/Sitio/Área */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <IconoLupa className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 dark:text-neutral-500 pointer-events-none" />
            <input
              value={busqueda}
              onChange={(e) => cambiarBusqueda(e.target.value)}
              placeholder="Buscar por nombre, área o código..."
              className="w-full rounded-xl border border-neutral-300 bg-white text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white pl-10 pr-4 py-2.5 text-sm placeholder-neutral-500 focus:border-orange-400 focus:ring-2 focus:ring-orange-500/15 outline-none"
            />
          </div>
          <div className="flex items-center gap-2 bg-white border border-neutral-200 dark:bg-neutral-900 dark:border-neutral-800 rounded-xl px-3.5 py-2.5">
            <ToggleSwitch checked={soloActivos} onChange={cambiarSoloActivos} label="Solo activos" />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 min-w-0">
            <ComboboxBuscable
              opciones={empresas}
              value={empresaFiltro}
              onChange={cambiarEmpresaFiltro}
              placeholder="Todas las empresas"
            />
          </div>
          <div className="flex-1 min-w-0">
            <ComboboxBuscable
              opciones={sitiosFiltro}
              value={sitioFiltro}
              onChange={cambiarSitioFiltro}
              placeholder="Todos los sitios"
            />
          </div>
          <div className="flex-1 min-w-0">
            <ComboboxBuscable
              opciones={areasFiltro}
              value={areaFiltro}
              onChange={cambiarAreaFiltro}
              placeholder="Todas las áreas"
            />
          </div>
        </div>
      </div>

      <div className="bg-neutral-50 dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 rounded-2xl overflow-hidden shadow-sm ring-1 ring-black/5 dark:ring-white/10">
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[680px]">
            <thead className="bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 text-left">
              <tr>
                <EncabezadoOrdenable campo="numero" ordenActivo={orden} onOrdenar={ordenar} className="w-12">N°</EncabezadoOrdenable>
                <EncabezadoOrdenable campo="codigoNomina" ordenActivo={orden} onOrdenar={ordenar}>Código</EncabezadoOrdenable>
                <EncabezadoOrdenable campo="nombreCompleto" ordenActivo={orden} onOrdenar={ordenar}>Nombre</EncabezadoOrdenable>
                <EncabezadoOrdenable campo="supervisorNombre" ordenActivo={orden} onOrdenar={ordenar}>Supervisor</EncabezadoOrdenable>
                <EncabezadoOrdenable campo="estado" ordenActivo={orden} onOrdenar={ordenar}>Estado</EncabezadoOrdenable>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {colaboradoresPagina.map((c, i) => (
                <tr key={c.id} className="border-t border-neutral-200/70 dark:border-neutral-800/70 hover:bg-neutral-100/60 dark:hover:bg-neutral-800/60 transition">
                  <td className="px-4 py-3 text-neutral-400 dark:text-neutral-500">{c.numero}</td>
                  <td className="px-4 py-3 text-neutral-500 dark:text-neutral-400">
                    {c.codigoNomina ?? <span className="text-amber-600">Sin código</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar nombre={c.nombreCompleto} indice={i} className="w-7 h-7 text-[11px]" />
                      <span>
                        {c.nombreCompleto}
                        {c.esSupervisor && (
                          <span className="ml-1.5 text-[10px] font-semibold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-500/10 px-1.5 py-0.5 rounded">
                            SUPERVISOR
                          </span>
                        )}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-neutral-500 dark:text-neutral-400">{c.supervisorNombre ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${
                        c.estado === "ACTIVO" ? "bg-green-100 text-green-800" : "bg-neutral-200 text-neutral-600"
                      }`}
                    >
                      {c.estado}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <MenuAcciones
                      acciones={[
                        { label: "Editar", onClick: () => abrirEditar(c) },
                        {
                          label: "Gestionar",
                          tono: "peligro",
                          onClick: () => { setIdGestionar(c.id); setErrorGestion(""); setConfirmandoEliminar(false); },
                        },
                      ]}
                    />
                  </td>
                </tr>
              ))}
              {colaboradoresFiltrados.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10">
                    <EstadoVacio
                      mensaje={
                        busqueda || empresaFiltro || sitioFiltro || areaFiltro
                          ? "Sin resultados para esos filtros"
                          : soloActivos
                          ? "No hay colaboradores activos"
                          : "Aún no hay colaboradores registrados"
                      }
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <Paginacion paginaActual={paginaActual} totalPaginas={totalPaginas} onCambiarPagina={setPaginaActual} />
      </div>
      </>
      )}

      <Modal
        abierto={modalAbierto && !confirmandoResetPin}
        onCerrar={() => setModalAbierto(false)}
        onConfirmar={guardar}
        className="bg-white dark:bg-neutral-900 text-black dark:text-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md p-7 space-y-4 max-h-[90vh] overflow-y-auto shadow-2xl"
      >
            <h2 className="text-lg font-bold text-neutral-900 dark:text-white">
              {editandoId ? "Editar colaborador" : "Nuevo colaborador"}
            </h2>

            {!editandoId && (
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                  PIN de acceso
                </label>
                <div className="mt-1.5 flex gap-1.5">
                  <input
                    value={generandoPin ? "" : pin}
                    readOnly
                    placeholder={generandoPin ? "Generando..." : "······"}
                    className="flex-1 min-w-0 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-3.5 py-3 text-lg font-bold tracking-[0.4em] text-neutral-900 dark:text-white outline-none"
                  />
                  <button
                    type="button"
                    onClick={copiarPin}
                    disabled={!pin || generandoPin}
                    title="Copiar PIN"
                    className="shrink-0 w-11 flex items-center justify-center rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition disabled:opacity-40"
                  >
                    {pinCopiado ? <IconoCheck className="w-4 h-4" /> : <IconoCopiar className="w-4 h-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={generarPin}
                    disabled={generandoPin}
                    title="Generar otro PIN"
                    className="shrink-0 w-11 flex items-center justify-center rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition disabled:opacity-40"
                  >
                    <IconoRefrescar className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">Copialo y comunícaselo al colaborador para su primer ingreso</p>
              </div>
            )}

            {editandoId && !reseteandoPin && (
              <button
                type="button"
                onClick={() => setConfirmandoResetPin(true)}
                className="text-xs font-semibold text-orange-600 hover:text-orange-700 transition"
              >
                Resetear PIN de acceso
              </button>
            )}

            {editandoId && reseteandoPin && (
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                    Nuevo PIN de acceso
                  </label>
                  <button
                    type="button"
                    onClick={() => { setReseteandoPin(false); setPin(""); }}
                    className="text-xs text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 transition"
                  >
                    Cancelar
                  </button>
                </div>
                <div className="mt-1.5 flex gap-1.5">
                  <input
                    value={generandoPin ? "" : pin}
                    readOnly
                    placeholder={generandoPin ? "Generando..." : "······"}
                    className="flex-1 min-w-0 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-3.5 py-3 text-lg font-bold tracking-[0.4em] text-neutral-900 dark:text-white outline-none"
                  />
                  <button
                    type="button"
                    onClick={copiarPin}
                    disabled={!pin || generandoPin}
                    title="Copiar PIN"
                    className="shrink-0 w-11 flex items-center justify-center rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition disabled:opacity-40"
                  >
                    {pinCopiado ? <IconoCheck className="w-4 h-4" /> : <IconoCopiar className="w-4 h-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={generarPin}
                    disabled={generandoPin}
                    title="Generar otro PIN"
                    className="shrink-0 w-11 flex items-center justify-center rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition disabled:opacity-40"
                  >
                    <IconoRefrescar className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-amber-600 mt-1">
                  El PIN anterior deja de funcionar en cuanto guardes. Copialo y comunícaselo al colaborador.
                </p>
              </div>
            )}

            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                Código de nómina
              </label>
              <input
                value={codigoNomina}
                onChange={(e) => setCodigoNomina(e.target.value.toUpperCase())}
                className="mt-1.5 w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white px-3.5 py-3 text-sm focus:border-orange-400 focus:ring-2 focus:ring-orange-500/15 outline-none"
                placeholder="Ej: EMP-00123"
                autoFocus
              />
              <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">El mismo código con el que está registrado en nómina</p>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                Apellidos
              </label>
              <input
                value={apellidos}
                onChange={(e) => setApellidos(e.target.value.toUpperCase())}
                className="mt-1.5 w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white px-3.5 py-3 text-sm focus:border-orange-400 focus:ring-2 focus:ring-orange-500/15 outline-none"
                placeholder="Ej: SÁNCHEZ PÉREZ"
              />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                Nombres
              </label>
              <input
                value={nombres}
                onChange={(e) => setNombres(e.target.value.toUpperCase())}
                className="mt-1.5 w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white px-3.5 py-3 text-sm focus:border-orange-400 focus:ring-2 focus:ring-orange-500/15 outline-none"
                placeholder="Ej: PEDRO"
              />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Área</label>
              <div className="mt-1.5">
                <ComboboxBuscable
                  opciones={areasDisponibles}
                  value={areaId}
                  onChange={setAreaId}
                  placeholder="Selecciona un área"
                />
              </div>
              {editandoId && (
                <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1.5">
                  Para asignarle rutas exclusivas, usá la pantalla{" "}
                  <a href="/th/rutas/asignaciones" className="text-orange-600 hover:text-orange-700 font-medium">
                    Asignar rutas
                  </a>
                </p>
              )}
            </div>

            {editandoId && (
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Estado</label>
                <div className="mt-1.5 flex bg-neutral-100 dark:bg-neutral-800 rounded-xl p-1 gap-1">
                  {[
                    { value: "ACTIVO", label: "Activo" },
                    { value: "INACTIVO", label: "Inactivo" },
                  ].map((op) => (
                    <button
                      key={op.value}
                      type="button"
                      onClick={() => setEstadoEdicion(op.value)}
                      className={`flex-1 text-xs font-semibold py-2 rounded-lg transition ${
                        estadoEdicion === op.value
                          ? "bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm"
                          : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-200/70 dark:hover:bg-neutral-700"
                      }`}
                    >
                      {op.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                Tipo de colaborador
              </label>
              <div className="mt-1.5 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setEsSupervisor(false)}
                  className={`text-left px-3.5 py-3 rounded-xl border-2 transition ${
                    !esSupervisor ? "border-orange-400 bg-orange-50 dark:bg-orange-500/10" : "border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 hover:bg-neutral-50 dark:hover:bg-neutral-800/60 hover:shadow-sm hover:-translate-y-0.5"
                  }`}
                >
                  <p className={`text-sm font-semibold ${!esSupervisor ? "text-orange-700 dark:text-orange-400" : "text-neutral-800 dark:text-neutral-200"}`}>
                    Colaborador
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">Registra y da seguimiento a sus propios pasajes.</p>
                </button>
                <button
                  type="button"
                  onClick={() => setEsSupervisor(true)}
                  className={`text-left px-3.5 py-3 rounded-xl border-2 transition ${
                    esSupervisor ? "border-orange-400 bg-orange-50 dark:bg-orange-500/10" : "border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 hover:bg-neutral-50 dark:hover:bg-neutral-800/60 hover:shadow-sm hover:-translate-y-0.5"
                  }`}
                >
                  <p className={`text-sm font-semibold ${esSupervisor ? "text-orange-700 dark:text-orange-400" : "text-neutral-800 dark:text-neutral-200"}`}>
                    Supervisor
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">Además, puede registrar pasajes por su equipo.</p>
                </button>
              </div>
              {editandoId && (
                <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1.5">
                  Para asignarle su equipo, usá la pantalla{" "}
                  <a href="/th/colaboradores/asignaciones" className="text-orange-600 hover:text-orange-700 font-medium">
                    Asignar equipo
                  </a>
                </p>
              )}
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex gap-2 justify-end pt-1">
              <button
                onClick={() => setModalAbierto(false)}
                className="px-4 py-2.5 text-sm font-medium text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition"
              >
                Cancelar
              </button>
              <button
                onClick={guardar}
                disabled={guardando}
                className="px-5 py-2.5 text-sm font-semibold bg-orange-500 hover:bg-orange-600 text-white rounded-xl disabled:opacity-50 transition flex items-center justify-center gap-2"
              >
                {guardando && <Spinner className="w-4 h-4" />}
                {guardando ? "Guardando..." : "Guardar"}
              </button>
            </div>
      </Modal>

      {/* Modal: advertencia antes de resetear el PIN */}
      <Modal
        abierto={confirmandoResetPin}
        onCerrar={() => setConfirmandoResetPin(false)}
        onConfirmar={() => { setConfirmandoResetPin(false); setReseteandoPin(true); generarPin(); }}
        variante="centro"
        className="bg-white dark:bg-neutral-900 text-black dark:text-white rounded-3xl p-7 w-full max-w-xs text-center space-y-4 shadow-2xl"
      >
        <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto"><IconoAlerta className="w-6 h-6" /></div>
        <p className="font-semibold text-neutral-900 dark:text-white">¿Resetear el PIN de acceso?</p>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          El PIN actual dejará de funcionar en cuanto guardes los cambios. Vas a tener que comunicarle el nuevo PIN al colaborador.
        </p>
        <div className="flex gap-2 justify-center pt-1">
          <button
            type="button"
            onClick={() => setConfirmandoResetPin(false)}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-neutral-600 dark:text-neutral-300 border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => { setConfirmandoResetPin(false); setReseteandoPin(true); generarPin(); }}
            className="flex-1 px-4 py-2.5 text-sm font-semibold bg-orange-500 hover:bg-orange-600 text-white rounded-xl transition"
          >
            Sí, resetear
          </button>
        </div>
      </Modal>

      <Modal abierto={!!idGestionar && !confirmandoEliminar} onCerrar={() => setIdGestionar(null)} variante="centro" className="bg-white dark:bg-neutral-900 text-black dark:text-white rounded-3xl p-7 w-full max-w-sm space-y-4 shadow-2xl">
            <div>
              <h2 className="font-semibold text-neutral-900 dark:text-white">{colaboradorGestionar?.nombreCompleto}</h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">Elige qué hacer con este colaborador</p>
            </div>

            {errorGestion && <p className="text-sm text-red-600">{errorGestion}</p>}

            <div className="space-y-2">
              {colaboradorGestionar?.estado === "ACTIVO" ? (
                <button
                  onClick={() => cambiarEstado("INACTIVO")}
                  disabled={procesando}
                  className="w-full text-left px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition disabled:opacity-50"
                >
                  <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">Desactivar</p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">No podrá iniciar sesión, pero conserva su historial. Se puede reactivar luego.</p>
                </button>
              ) : (
                <button
                  onClick={() => cambiarEstado("ACTIVO")}
                  disabled={procesando}
                  className="w-full text-left px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition disabled:opacity-50"
                >
                  <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">Reactivar</p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">Vuelve a poder iniciar sesión normalmente.</p>
                </button>
              )}

              <button
                onClick={() => setConfirmandoEliminar(true)}
                disabled={procesando || colaboradorGestionar?.tieneSolicitudes}
                className="w-full text-left px-4 py-3 rounded-xl border border-red-200 hover:bg-red-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <p className="text-sm font-medium text-red-600">Eliminar definitivamente</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  {colaboradorGestionar?.tieneSolicitudes
                    ? "No disponible: tiene solicitudes registradas en su historial."
                    : "Borra su cuenta y perfil por completo. No se puede deshacer."}
                </p>
              </button>
            </div>

            <button
              onClick={() => setIdGestionar(null)}
              disabled={procesando}
              className="w-full text-center text-sm font-medium text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl py-2.5 transition"
            >
              Cancelar
            </button>
      </Modal>

      <Modal abierto={confirmandoEliminar} onCerrar={() => setConfirmandoEliminar(false)} onConfirmar={eliminarPermanente} variante="centro" className="bg-white dark:bg-neutral-900 text-black dark:text-white rounded-3xl p-7 w-full max-w-xs text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto"><IconoAlerta className="w-6 h-6" /></div>
            <p className="font-semibold text-neutral-900 dark:text-white">¿Eliminar a {colaboradorGestionar?.nombreCompleto}?</p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Esta acción no se puede deshacer.</p>
            {errorGestion && <p className="text-sm text-red-600">{errorGestion}</p>}
            <div className="flex gap-2 justify-center pt-1">
              <button
                onClick={() => setConfirmandoEliminar(false)}
                disabled={procesando}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
              >
                Cancelar
              </button>
              <button
                onClick={eliminarPermanente}
                disabled={procesando}
                className="flex-1 px-4 py-2.5 text-sm font-semibold bg-red-500 hover:bg-red-600 text-white rounded-xl disabled:opacity-50 transition"
              >
                {procesando ? "Eliminando..." : "Sí, eliminar"}
              </button>
            </div>
      </Modal>
    </div>
  );
}