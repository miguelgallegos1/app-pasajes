// components/PanelColaboradoresTH.tsx
// CRUD de Colaboradores: crear, editar (con Estado incluido), buscador,
// switch "Solo activos" (encendido por defecto), paginación, y modal
// de "Gestionar" (Desactivar/Reactivar + Eliminar permanente).

"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import ComboboxBuscable from "./ComboboxBuscable";
import ToggleSwitch from "./ToggleSwitch";
import Paginacion from "./Paginacion";
import Modal from "./Modal";
import Spinner from "./Spinner";
import { useToast } from "./Toast";

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
  areaId: string;
  areaLabel: string;
  tieneSolicitudes: boolean;
};

type Opcion = { id: string; label: string };

const POR_PAGINA = 10;

export default function PanelColaboradoresTH({
  colaboradores,
  areasDisponibles,
  supervisoresDisponibles,
  sinAsignaciones,
}: {
  colaboradores: Colaborador[];
  areasDisponibles: Opcion[];
  supervisoresDisponibles: Opcion[];
  sinAsignaciones: boolean;
}) {
  const router = useRouter();
  const toast = useToast();

  const [busqueda, setBusqueda] = useState("");
  const [soloActivos, setSoloActivos] = useState(true); // arranca mostrando solo Activos
  const [paginaActual, setPaginaActual] = useState(1);

  const colaboradoresFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return colaboradores.filter((c) => {
      if (soloActivos && c.estado !== "ACTIVO") return false;
      if (!texto) return true;
      return (
        c.nombreCompleto.toLowerCase().includes(texto) ||
        c.areaLabel.toLowerCase().includes(texto) ||
        (c.codigoNomina ?? "").toLowerCase().includes(texto)
      );
    });
  }, [colaboradores, busqueda, soloActivos]);

  const totalPaginas = Math.max(1, Math.ceil(colaboradoresFiltrados.length / POR_PAGINA));
  const colaboradoresPagina = useMemo(
    () => colaboradoresFiltrados.slice((paginaActual - 1) * POR_PAGINA, paginaActual * POR_PAGINA),
    [colaboradoresFiltrados, paginaActual]
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
  const [esSupervisor, setEsSupervisor] = useState(false);
  const [supervisorId, setSupervisorId] = useState("");
  const [estadoEdicion, setEstadoEdicion] = useState("ACTIVO");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  const [idGestionar, setIdGestionar] = useState<string | null>(null);
  const [procesando, setProcesando] = useState(false);
  const [errorGestion, setErrorGestion] = useState("");

  const abrirCrear = () => {
    setEditandoId(null);
    setApellidos("");
    setNombres("");
    setCodigoNomina("");
    setAreaId("");
    setPin("");
    setEsSupervisor(false);
    setSupervisorId("");
    setEstadoEdicion("ACTIVO");
    setError("");
    setModalAbierto(true);
  };

  const abrirEditar = (c: Colaborador) => {
    setEditandoId(c.id);
    setApellidos(c.apellidos);
    setNombres(c.nombres);
    setCodigoNomina(c.codigoNomina ?? "");
    setAreaId(c.areaId);
    setPin("");
    setEsSupervisor(c.esSupervisor);
    setSupervisorId("");
    setEstadoEdicion(c.estado);
    setError("");
    setModalAbierto(true);
  };

  const guardar = async () => {
    if (!apellidos.trim() || !nombres.trim() || !codigoNomina.trim() || !areaId) {
      setError("Apellidos, Nombres, Código de nómina y Área son obligatorios");
      return;
    }
    if (!editandoId && !/^\d{6}$/.test(pin)) {
      setError("El PIN debe tener exactamente 6 dígitos");
      return;
    }

    setGuardando(true);
    setError("");

    const url = editandoId ? `/api/colaboradores/${editandoId}` : "/api/colaboradores";
    const method = editandoId ? "PATCH" : "POST";
    const body = editandoId
      ? { apellidos, nombres, codigoNomina, areaId, esSupervisor, supervisorId: supervisorId || null, estado: estadoEdicion }
      : { apellidos, nombres, codigoNomina, areaId, pin, esSupervisor, supervisorId: supervisorId || null };

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setGuardando(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "No se pudo guardar");
      toast.error(data.error ?? "No se pudo guardar el colaborador");
      return;
    }
    setModalAbierto(false);
    toast.exito(editandoId ? "Colaborador actualizado" : "Colaborador creado");
    router.refresh();
  };

  const colaboradorGestionar = colaboradores.find((c) => c.id === idGestionar);

  const cambiarEstado = async (nuevoEstado: "ACTIVO" | "INACTIVO") => {
    if (!idGestionar) return;
    setProcesando(true);
    setErrorGestion("");
    const res = await fetch(`/api/colaboradores/${idGestionar}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado: nuevoEstado }),
    });
    setProcesando(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setErrorGestion(data.error ?? "No se pudo actualizar");
      toast.error(data.error ?? "No se pudo actualizar el colaborador");
      return;
    }
    setIdGestionar(null);
    toast.exito(nuevoEstado === "ACTIVO" ? "Colaborador reactivado" : "Colaborador desactivado");
    router.refresh();
  };

  const eliminarPermanente = async () => {
    if (!idGestionar) return;
    setProcesando(true);
    setErrorGestion("");
    const res = await fetch(`/api/colaboradores/${idGestionar}`, { method: "DELETE" });
    setProcesando(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setErrorGestion(data.error ?? "No se pudo eliminar");
      toast.error(data.error ?? "No se pudo eliminar el colaborador");
      return;
    }
    setIdGestionar(null);
    toast.exito("Colaborador eliminado");
    router.refresh();
  };

  return (
    <div className="flex-1 px-4 sm:px-8 py-5 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-lg sm:text-xl font-bold">Colaboradores</h1>
        <button
          onClick={abrirCrear}
          disabled={sinAsignaciones}
          className="text-xs sm:text-sm font-semibold bg-orange-500 hover:bg-orange-600 text-black px-3 py-2 rounded-lg transition shadow-sm hover:shadow-md disabled:opacity-40"
        >
          + Nuevo colaborador
        </button>
      </div>

      {sinAsignaciones && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-xl px-4 py-3">
          No tienes ninguna Empresa/Sitio/Área asignada todavía.
        </div>
      )}

      {/* Barra de filtros: buscador + switch, elegante y responsive */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <input
            value={busqueda}
            onChange={(e) => cambiarBusqueda(e.target.value)}
            placeholder="Buscar por nombre, área o código..."
            className="w-full rounded-xl border border-neutral-700 bg-neutral-900 text-white px-4 py-2.5 text-sm placeholder-neutral-500 focus:border-orange-400 focus:ring-2 focus:ring-orange-500/15 outline-none"
          />
        </div>
        <div className="flex items-center gap-2 bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2.5">
          <ToggleSwitch checked={soloActivos} onChange={cambiarSoloActivos} label="Solo activos" />
        </div>
      </div>

      <div className="bg-neutral-50 text-neutral-800 rounded-2xl overflow-hidden shadow-sm ring-1 ring-black/5">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[680px]">
            <thead className="bg-neutral-100/70 text-neutral-500 text-left">
              <tr>
                <th className="px-4 py-3 font-medium w-12">N°</th>
                <th className="px-4 py-3 font-medium">Nombre</th>
                <th className="px-4 py-3 font-medium">Código</th>
                <th className="px-4 py-3 font-medium">Área</th>
                <th className="px-4 py-3 font-medium">Supervisor</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {colaboradoresPagina.map((c) => (
                <tr key={c.id} className="border-t border-neutral-200/70 hover:bg-neutral-100/60 transition">
                  <td className="px-4 py-3 text-neutral-400">{c.numero}</td>
                  <td className="px-4 py-3">
                    {c.nombreCompleto}
                    {c.esSupervisor && (
                      <span className="ml-1.5 text-[10px] font-semibold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">
                        SUPERVISOR
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-neutral-500">
                    {c.codigoNomina ?? <span className="text-amber-600">Sin código</span>}
                  </td>
                  <td className="px-4 py-3 text-neutral-600">{c.areaLabel}</td>
                  <td className="px-4 py-3 text-neutral-500">{c.supervisorNombre ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${
                        c.estado === "ACTIVO" ? "bg-green-100 text-green-800" : "bg-neutral-200 text-neutral-600"
                      }`}
                    >
                      {c.estado}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => abrirEditar(c)}
                        className="text-xs font-medium text-white bg-neutral-700 hover:bg-neutral-800 px-3 py-1.5 rounded-full transition"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => { setIdGestionar(c.id); setErrorGestion(""); }}
                        className="text-xs font-medium text-white bg-red-500 hover:bg-red-600 px-3 py-1.5 rounded-full transition"
                      >
                        Gestionar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {colaboradoresFiltrados.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-neutral-400">
                    {busqueda
                      ? "Sin resultados para esa búsqueda"
                      : soloActivos
                      ? "No hay colaboradores activos"
                      : "Aún no hay colaboradores registrados"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <Paginacion paginaActual={paginaActual} totalPaginas={totalPaginas} onCambiarPagina={setPaginaActual} />
      </div>

      <Modal
        abierto={modalAbierto}
        className="bg-white text-black rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md p-7 space-y-4 max-h-[90vh] overflow-y-auto shadow-2xl"
      >
            <h2 className="text-lg font-bold text-neutral-900">
              {editandoId ? "Editar colaborador" : "Nuevo colaborador"}
            </h2>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Código de nómina
              </label>
              <input
                value={codigoNomina}
                onChange={(e) => setCodigoNomina(e.target.value.toUpperCase())}
                className="mt-1.5 w-full rounded-xl border border-neutral-200 px-3.5 py-3 text-sm focus:border-orange-400 focus:ring-2 focus:ring-orange-500/15 outline-none"
                placeholder="Ej: EMP-00123"
                autoFocus
              />
              <p className="text-xs text-neutral-400 mt-1">El mismo código con el que está registrado en nómina</p>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Apellidos
              </label>
              <input
                value={apellidos}
                onChange={(e) => setApellidos(e.target.value.toUpperCase())}
                className="mt-1.5 w-full rounded-xl border border-neutral-200 px-3.5 py-3 text-sm focus:border-orange-400 focus:ring-2 focus:ring-orange-500/15 outline-none"
                placeholder="Ej: SÁNCHEZ PÉREZ"
              />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Nombres
              </label>
              <input
                value={nombres}
                onChange={(e) => setNombres(e.target.value.toUpperCase())}
                className="mt-1.5 w-full rounded-xl border border-neutral-200 px-3.5 py-3 text-sm focus:border-orange-400 focus:ring-2 focus:ring-orange-500/15 outline-none"
                placeholder="Ej: PEDRO"
              />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Área</label>
              <div className="mt-1.5">
                <ComboboxBuscable
                  opciones={areasDisponibles}
                  value={areaId}
                  onChange={setAreaId}
                  placeholder="Selecciona un área"
                />
              </div>
            </div>

            {!editandoId && (
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  PIN (6 dígitos)
                </label>
                <input
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  inputMode="numeric"
                  className="mt-1.5 w-full rounded-xl border border-neutral-200 px-3.5 py-3 text-sm tracking-widest focus:border-orange-400 focus:ring-2 focus:ring-orange-500/15 outline-none"
                  placeholder="••••••"
                />
              </div>
            )}

            {editandoId && (
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Estado</label>
                <div className="mt-1.5 flex bg-neutral-100 rounded-xl p-1 gap-1">
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
                          ? "bg-white text-neutral-900 shadow-sm"
                          : "text-neutral-500 hover:text-neutral-700"
                      }`}
                    >
                      {op.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={esSupervisor}
                onChange={(e) => setEsSupervisor(e.target.checked)}
                className="w-4 h-4 accent-orange-500 rounded"
                id="chk-supervisor"
              />
              <label htmlFor="chk-supervisor" className="text-sm text-neutral-700">
                Este colaborador es Supervisor
              </label>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Reporta a (opcional)
              </label>
              <div className="mt-1.5">
                <ComboboxBuscable
                  opciones={supervisoresDisponibles}
                  value={supervisorId}
                  onChange={setSupervisorId}
                  placeholder="Sin supervisor"
                />
              </div>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex gap-2 justify-end pt-1">
              <button
                onClick={() => setModalAbierto(false)}
                className="px-4 py-2.5 text-sm font-medium text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100 rounded-xl transition"
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

      <Modal abierto={!!idGestionar} variante="centro" className="bg-white text-black rounded-3xl p-7 w-full max-w-sm space-y-4 shadow-2xl">
            <div>
              <h2 className="font-semibold text-neutral-900">{colaboradorGestionar?.nombreCompleto}</h2>
              <p className="text-xs text-neutral-500 mt-0.5">Elige qué hacer con este colaborador</p>
            </div>

            {errorGestion && <p className="text-sm text-red-600">{errorGestion}</p>}

            <div className="space-y-2">
              {colaboradorGestionar?.estado === "ACTIVO" ? (
                <button
                  onClick={() => cambiarEstado("INACTIVO")}
                  disabled={procesando}
                  className="w-full text-left px-4 py-3 rounded-xl border border-neutral-200 hover:bg-neutral-50 transition disabled:opacity-50"
                >
                  <p className="text-sm font-medium text-neutral-800">Desactivar</p>
                  <p className="text-xs text-neutral-500">No podrá iniciar sesión, pero conserva su historial. Se puede reactivar luego.</p>
                </button>
              ) : (
                <button
                  onClick={() => cambiarEstado("ACTIVO")}
                  disabled={procesando}
                  className="w-full text-left px-4 py-3 rounded-xl border border-neutral-200 hover:bg-neutral-50 transition disabled:opacity-50"
                >
                  <p className="text-sm font-medium text-neutral-800">Reactivar</p>
                  <p className="text-xs text-neutral-500">Vuelve a poder iniciar sesión normalmente.</p>
                </button>
              )}

              <button
                onClick={eliminarPermanente}
                disabled={procesando || colaboradorGestionar?.tieneSolicitudes}
                className="w-full text-left px-4 py-3 rounded-xl border border-red-200 hover:bg-red-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <p className="text-sm font-medium text-red-600">Eliminar definitivamente</p>
                <p className="text-xs text-neutral-500">
                  {colaboradorGestionar?.tieneSolicitudes
                    ? "No disponible: tiene solicitudes registradas en su historial."
                    : "Borra su cuenta y perfil por completo. No se puede deshacer."}
                </p>
              </button>
            </div>

            <button
              onClick={() => setIdGestionar(null)}
              disabled={procesando}
              className="w-full text-center text-sm font-medium text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100 rounded-xl py-2.5 transition"
            >
              Cancelar
            </button>
      </Modal>
    </div>
  );
}