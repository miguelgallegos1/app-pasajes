// components/PanelColaboradoresTH.tsx
// CRUD de Colaboradores: crear, editar (con Estado incluido), buscador,
// filtro de Estado (Activos por defecto), paginación, y modal
// de "Gestionar" (Desactivar/Reactivar + Eliminar permanente).

"use client";

import { useState, useMemo, useEffect } from "react";
import ComboboxBuscable from "./ComboboxBuscable";
import BarraFiltros, { CampoEstadoActivo, CamposEmpresaSitioArea, chipEstadoActivo, chips, chipsEmpresaSitioArea, cumpleFiltroActivo, type FiltroActivo } from "./BarraFiltros";
import Paginacion from "./Paginacion";
import EncabezadoOrdenable from "./EncabezadoOrdenable";
import Modal from "./Modal";
import ModalGestionar from "./ModalGestionar";
import CampoPin from "./CampoPin";
import ModalConfirmar from "./ModalConfirmar";
import Spinner from "./Spinner";
import { useReportarCarga } from "../lib/cargaGlobal";
import { usePin } from "../lib/usePin";
import { IconoAlerta } from "./Icons";
import EstadoVacio from "./EstadoVacio";
import Avatar from "./Avatar";
import MenuAcciones from "./MenuAcciones";
import { useToast } from "./Toast";
import { useOrdenTabla } from "../lib/useOrdenTabla";
import { useFiltroEmpresaSitioArea } from "../lib/useFiltroEmpresaSitioArea";
import { useAccionesHeader } from "../lib/accionesHeader";

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
  sitioNombre: string;
  areaNombre: string;
  tieneSolicitudes: boolean;
};

type CampoOrden = "numero" | "codigoNomina" | "nombreCompleto" | "ubicacion" | "supervisorNombre" | "estado";
const VALOR_ORDEN: Record<CampoOrden, (c: Colaborador) => string | number> = {
  numero: (c) => c.numero,
  codigoNomina: (c) => c.codigoNomina ?? "",
  nombreCompleto: (c) => c.nombreCompleto,
  ubicacion: (c) => `${c.sitioNombre} ${c.areaNombre}`,
  supervisorNombre: (c) => c.supervisorNombre ?? "",
  estado: (c) => c.estado,
};

type Opcion = { id: string; label: string };
type Sitio = { id: string; nombre: string; empresaId: string };
type Area = { id: string; nombre: string; sitioId: string };

const POR_PAGINA = 15;

export default function PanelColaboradoresTH() {
  const toast = useToast();

  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [areasDisponibles, setAreasDisponibles] = useState<Opcion[]>([]);
  const [empresas, setEmpresas] = useState<Opcion[]>([]);
  const [sitios, setSitios] = useState<Sitio[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [sinAsignaciones, setSinAsignaciones] = useState(false);
  const [truncado, setTruncado] = useState(false);
  const [cargandoInicial, setCargandoInicial] = useState(true);
  const [errorInicial, setErrorInicial] = useState("");
  useReportarCarga(cargandoInicial);

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
      setTruncado(data.truncado);
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
        setTruncado(data.truncado);
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
  // Activos por defecto; los inactivos se ven desde el panel de Filtros
  // (hace falta verlos para poder reactivarlos).
  const [estadoFiltro, setEstadoFiltro] = useState<FiltroActivo>("ACTIVO");
  const [paginaActual, setPaginaActual] = useState(1);
  const resetPagina = () => setPaginaActual(1);

  const filtroUbicacion = useFiltroEmpresaSitioArea(sitios, areas, resetPagina);
  const { empresaFiltro, sitioFiltro, areaFiltro, cambiarEmpresaFiltro } = filtroUbicacion;

  const colaboradoresFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return colaboradores.filter((c) => {
      if (!cumpleFiltroActivo(estadoFiltro, c.estado === "ACTIVO")) return false;
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
  }, [colaboradores, busqueda, estadoFiltro, empresaFiltro, sitioFiltro, areaFiltro]);

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

  const cambiarEstadoFiltro = (v: FiltroActivo) => {
    setEstadoFiltro(v);
    setPaginaActual(1);
  };

  const [modalAbierto, setModalAbierto] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [apellidos, setApellidos] = useState("");
  const [nombres, setNombres] = useState("");
  const [codigoNomina, setCodigoNomina] = useState("");
  const [areaId, setAreaId] = useState("");
  const pinAcceso = usePin();
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




  const abrirCrear = () => {
    setEditandoId(null);
    setApellidos("");
    setNombres("");
    setCodigoNomina("");
    setAreaId("");
    pinAcceso.limpiar();
    setEsSupervisor(false);
    setEstadoEdicion("ACTIVO");
    setError("");
    setModalAbierto(true);
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
    pinAcceso.limpiar();
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
    if (!editandoId && !pinAcceso.esUsuario && !/^\d{6}$/.test(pinAcceso.pin)) {
      setError("Genera el PIN de acceso antes de guardar");
      return;
    }
    if (reseteandoPin && !/^\d{6}$/.test(pinAcceso.pin)) {
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
          ...(reseteandoPin ? { pin: pinAcceso.pin, pinFirma: pinAcceso.firma } : {}),
        }
      : {
          apellidos,
          nombres,
          codigoNomina,
          areaId,
          esSupervisor,
          ...(pinAcceso.esUsuario ? {} : { pin: pinAcceso.pin, pinFirma: pinAcceso.firma }),
        };

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
      const creado = editandoId ? null : await res.json().catch(() => ({}));
      setModalAbierto(false);
      toast.exito(
        editandoId
          ? reseteandoPin ? "Colaborador actualizado y PIN reseteado" : "Colaborador actualizado"
          : creado?.sinPin ? "Colaborador creado sin PIN: ya es usuario de la app" : "Colaborador creado"
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

  useAccionesHeader(
    <button
      onClick={abrirCrear}
      disabled={sinAsignaciones}
      className="text-xs sm:text-sm font-semibold bg-orange-500 hover:bg-orange-600 text-black px-3 py-2 rounded-lg transition shadow-sm hover:shadow-md disabled:opacity-40 disabled:hover:shadow-sm"
    >
      + Nuevo colaborador
    </button>
  );

  return (
    <div className="flex-1 px-4 sm:px-8 pb-5 space-y-4">
      {errorInicial && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{errorInicial}</div>
      )}

      {sinAsignaciones && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-xl px-4 py-3">
          No tienes ninguna Empresa/Sitio/Área asignada todavía.
        </div>
      )}

      {truncado && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-xl px-4 py-3">
          Hay más colaboradores de los que esta pantalla puede cargar: solo se muestran los primeros {colaboradores.length.toLocaleString("es-EC")}, y el resto no aparece ni en la búsqueda. Avisa al administrador del sistema.
        </div>
      )}

      {!cargandoInicial && (
      <>
      <BarraFiltros
        busqueda={{ valor: busqueda, onCambiar: cambiarBusqueda, placeholder: "Buscar...", ayuda: "Busca por nombre, área o código" }}
        chips={chips(
          chipEstadoActivo(estadoFiltro, () => cambiarEstadoFiltro("ACTIVO")),
          ...chipsEmpresaSitioArea(empresas, filtroUbicacion)
        )}
        onLimpiar={() => { cambiarEmpresaFiltro(""); cambiarEstadoFiltro("ACTIVO"); }}
        resultados={colaboradoresFiltrados.length}
      >
        <CampoEstadoActivo valor={estadoFiltro} onCambiar={cambiarEstadoFiltro} />
        <CamposEmpresaSitioArea empresas={empresas} filtro={filtroUbicacion} />
      </BarraFiltros>

      <div className="bg-neutral-50 dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 rounded-2xl overflow-hidden shadow-sm ring-1 ring-black/5 dark:ring-white/10">
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[820px]">
            <thead className="bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 text-left">
              <tr>
                <EncabezadoOrdenable campo="numero" ordenActivo={orden} onOrdenar={ordenar} className="w-12">N°</EncabezadoOrdenable>
                <EncabezadoOrdenable campo="codigoNomina" ordenActivo={orden} onOrdenar={ordenar}>Código</EncabezadoOrdenable>
                <EncabezadoOrdenable campo="nombreCompleto" ordenActivo={orden} onOrdenar={ordenar}>Nombre</EncabezadoOrdenable>
                <EncabezadoOrdenable campo="ubicacion" ordenActivo={orden} onOrdenar={ordenar}>Ubicación</EncabezadoOrdenable>
                <EncabezadoOrdenable campo="supervisorNombre" ordenActivo={orden} onOrdenar={ordenar}>Supervisor</EncabezadoOrdenable>
                <EncabezadoOrdenable campo="estado" ordenActivo={orden} onOrdenar={ordenar}>Estado</EncabezadoOrdenable>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {colaboradoresPagina.map((c, i) => (
                <tr key={c.id} className="border-t border-neutral-200/70 dark:border-neutral-800/70 hover:bg-neutral-100/60 dark:hover:bg-neutral-800/60 transition">
                  <td className="px-4 py-2 text-neutral-400 dark:text-neutral-500">{c.numero}</td>
                  <td className="px-4 py-2 text-neutral-500 dark:text-neutral-400">
                    {c.codigoNomina ?? <span className="text-amber-600">Sin código</span>}
                  </td>
                  <td className="px-4 py-2">
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
                  <td className="px-4 py-2">
                    <span className="block text-neutral-700 dark:text-neutral-200">{c.areaNombre}</span>
                    <span className="block text-[10px] text-neutral-400 dark:text-neutral-500">{c.sitioNombre}</span>
                  </td>
                  <td className="px-4 py-2 text-neutral-500 dark:text-neutral-400">{c.supervisorNombre ?? "—"}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${
                        c.estado === "ACTIVO" ? "bg-green-100 text-green-800" : "bg-neutral-200 text-neutral-600"
                      }`}
                    >
                      {c.estado}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
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
                  <td colSpan={7} className="px-4 py-10">
                    <EstadoVacio
                      mensaje={
                        busqueda || empresaFiltro || sitioFiltro || areaFiltro
                          ? "Sin resultados para esos filtros"
                          : estadoFiltro === "ACTIVO"
                          ? "No hay colaboradores activos"
                          : estadoFiltro === "INACTIVO"
                          ? "No hay colaboradores inactivos"
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
              <CampoPin
                pin={pinAcceso}
                etiqueta="Nuevo PIN de acceso"
                ayuda="El PIN anterior deja de funcionar en cuanto guardes. Cópialo y comunícaselo al colaborador."
                advertencia
                onCancelar={() => { setReseteandoPin(false); pinAcceso.limpiar(); }}
              />
            )}

            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                Código de nómina
              </label>
              <input
                value={codigoNomina}
                onChange={(e) => {
                  setCodigoNomina(e.target.value.toUpperCase());
                  // El PIN (o el aviso de "ya es usuario") se generó para el
                  // código anterior: hay que volver a generarlo.
                  if (!editandoId && (pinAcceso.pin || pinAcceso.esUsuario || pinAcceso.generando)) pinAcceso.limpiar();
                }}
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
                  Para asignarle rutas exclusivas, usa la pantalla{" "}
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
                    !esSupervisor ? "border-orange-400 bg-orange-50 dark:bg-orange-500/10" : "border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 hover:bg-neutral-50 dark:hover:bg-neutral-800/60 hover:shadow-sm"
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
                    esSupervisor ? "border-orange-400 bg-orange-50 dark:bg-orange-500/10" : "border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 hover:bg-neutral-50 dark:hover:bg-neutral-800/60 hover:shadow-sm"
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
                  Para asignarle su equipo, usa la pantalla{" "}
                  <a href="/th/colaboradores/asignaciones" className="text-orange-600 hover:text-orange-700 font-medium">
                    Asignar equipo
                  </a>
                </p>
              )}
            </div>

            {/* PIN de acceso: se genera al final, con los datos ya llenos
                (abrir el formulario no consume ninguna generación). */}
            {!editandoId && (pinAcceso.pin ? (
              <CampoPin pin={pinAcceso} etiqueta="PIN de acceso" ayuda="Cópialo y comunícaselo al colaborador para su primer ingreso" />
            ) : pinAcceso.esUsuario ? (
              <p className="text-xs rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 px-3.5 py-3">
                Este código de nómina es de un usuario de la app: su ficha se crea sin PIN y no podrá ingresar con ella. Para que pida sus pasajes, relaciona la ficha en Admin → Usuarios.
              </p>
            ) : (
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">PIN de acceso</label>
                <button
                  type="button"
                  onClick={() => pinAcceso.generar(codigoNomina)}
                  disabled={pinAcceso.generando || !apellidos.trim() || !nombres.trim() || !codigoNomina.trim() || !areaId}
                  className="mt-1.5 w-full px-4 py-3 text-sm font-semibold rounded-xl border border-orange-300 dark:border-orange-500/40 text-orange-700 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-500/10 disabled:opacity-40 disabled:hover:bg-transparent transition flex items-center justify-center gap-2"
                >
                  {pinAcceso.generando && <Spinner className="w-4 h-4" />}
                  {pinAcceso.generando ? "Generando..." : "Generar PIN"}
                </button>
                <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">Completa código, apellidos, nombres y área para generarlo.</p>
              </div>
            ))}

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
      <ModalConfirmar
        abierto={confirmandoResetPin}
        onCerrar={() => setConfirmandoResetPin(false)}
        onConfirmar={() => { setConfirmandoResetPin(false); setReseteandoPin(true); pinAcceso.generar(); }}
        procesando={false}
        tono="ambar"
        icono={IconoAlerta}
        titulo="¿Resetear el PIN de acceso?"
        textoConfirmar="Sí, resetear"
        textoProcesando="Sí, resetear"
      >
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          El PIN actual dejará de funcionar en cuanto guardes los cambios. Vas a tener que comunicarle el nuevo PIN al colaborador.
        </p>
      </ModalConfirmar>

      <ModalGestionar
        abierto={!!idGestionar && !confirmandoEliminar}
        onCerrar={() => setIdGestionar(null)}
        titulo={colaboradorGestionar?.nombreCompleto}
        subtitulo="Elige qué hacer con este colaborador"
        error={errorGestion}
        procesando={procesando}
        activo={colaboradorGestionar ? colaboradorGestionar.estado === "ACTIVO" : undefined}
        onCambiarActivo={(activo) => cambiarEstado(activo ? "ACTIVO" : "INACTIVO")}
        ayudaDesactivar="No podrá iniciar sesión, pero conserva su historial. Se puede reactivar luego."
        ayudaReactivar="Vuelve a poder iniciar sesión normalmente."
        onEliminar={() => setConfirmandoEliminar(true)}
        ayudaEliminar="Borra su cuenta y perfil por completo. No se puede deshacer."
        motivoNoEliminar={colaboradorGestionar?.tieneSolicitudes ? "No disponible: tiene solicitudes registradas en su historial." : null}
      />

      <ModalConfirmar
        abierto={confirmandoEliminar}
        onCerrar={() => setConfirmandoEliminar(false)}
        onConfirmar={eliminarPermanente}
        procesando={procesando}
        error={errorGestion}
        tono="rojo"
        icono={IconoAlerta}
        titulo={<>¿Eliminar a {colaboradorGestionar?.nombreCompleto}?</>}
        textoConfirmar="Sí, eliminar"
        textoProcesando="Eliminando..."
      >
        <p className="text-sm text-neutral-500 dark:text-neutral-400">Esta acción no se puede deshacer.</p>
      </ModalConfirmar>
    </div>
  );
}