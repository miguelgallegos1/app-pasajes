// components/PanelAsignacionEquipo.tsx
// Pantalla dedicada de "Asignar equipo": a la izquierda se filtra y elige
// un supervisor, a la derecha se marca con checkboxes qué colaboradores de
// su área le reportan. Reemplaza el combo "Reporta a" enterrado en el
// modal de Colaboradores (que además no precargaba el valor actual).

"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import ComboboxBuscable from "./ComboboxBuscable";
import ToggleSwitch from "./ToggleSwitch";
import Paginacion from "./Paginacion";
import Spinner from "./Spinner";
import { useToast } from "./Toast";

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

const POR_PAGINA = 8;

export default function PanelAsignacionEquipo({
  colaboradores,
  empresas,
  sitios,
  areas,
  sinAsignaciones,
}: {
  colaboradores: Colaborador[];
  empresas: Opcion[];
  sitios: Sitio[];
  areas: Area[];
  sinAsignaciones: boolean;
}) {
  const router = useRouter();
  const toast = useToast();

  const [busqueda, setBusqueda] = useState("");
  const [soloActivos, setSoloActivos] = useState(true);
  const [paginaActual, setPaginaActual] = useState(1);

  const [empresaFiltro, setEmpresaFiltro] = useState("");
  const [sitioFiltro, setSitioFiltro] = useState("");
  const [areaFiltro, setAreaFiltro] = useState("");

  const sitiosFiltro = useMemo(
    () =>
      sitios
        .filter((s) => !empresaFiltro || s.empresaId === empresaFiltro)
        .map((s) => ({ id: s.id, label: s.nombre })),
    [sitios, empresaFiltro]
  );
  const areasFiltro = useMemo(() => {
    const idsSitiosFiltro = new Set(sitiosFiltro.map((s) => s.id));
    return areas
      .filter((a) => (sitioFiltro ? a.sitioId === sitioFiltro : !empresaFiltro || idsSitiosFiltro.has(a.sitioId)))
      .map((a) => ({ id: a.id, label: a.nombre }));
  }, [areas, sitioFiltro, empresaFiltro, sitiosFiltro]);

  const cambiarEmpresaFiltro = (v: string) => {
    setEmpresaFiltro(v);
    setSitioFiltro("");
    setAreaFiltro("");
    setPaginaActual(1);
  };
  const cambiarSitioFiltro = (v: string) => {
    setSitioFiltro(v);
    setAreaFiltro("");
    setPaginaActual(1);
  };
  const cambiarAreaFiltro = (v: string) => { setAreaFiltro(v); setPaginaActual(1); };
  const cambiarBusqueda = (v: string) => { setBusqueda(v); setPaginaActual(1); };
  const cambiarSoloActivos = (v: boolean) => { setSoloActivos(v); setPaginaActual(1); };

  const supervisores = useMemo(() => colaboradores.filter((c) => c.esSupervisor), [colaboradores]);

  const supervisoresFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return supervisores.filter((c) => {
      if (soloActivos && c.estado !== "ACTIVO") return false;
      if (empresaFiltro && c.empresaId !== empresaFiltro) return false;
      if (sitioFiltro && c.sitioId !== sitioFiltro) return false;
      if (areaFiltro && c.areaId !== areaFiltro) return false;
      if (!texto) return true;
      return (
        c.nombreCompleto.toLowerCase().includes(texto) ||
        (c.codigoNomina ?? "").toLowerCase().includes(texto)
      );
    });
  }, [supervisores, busqueda, soloActivos, empresaFiltro, sitioFiltro, areaFiltro]);

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

  const supervisorSeleccionado = colaboradores.find((c) => c.id === supervisorSeleccionadoId) ?? null;

  const equipoActual = (supervisor: Colaborador) =>
    colaboradores.filter((c) => c.supervisorId === supervisor.id).map((c) => c.id);

  const seleccionarSupervisor = (c: Colaborador) => {
    setSupervisorSeleccionadoId(c.id);
    setMiembroIdsSeleccionados(equipoActual(c));
    setBusquedaMiembro("");
    setError("");
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
    if (!texto) return candidatosDelArea;
    return candidatosDelArea.filter(
      (c) => c.nombreCompleto.toLowerCase().includes(texto) || (c.codigoNomina ?? "").toLowerCase().includes(texto)
    );
  }, [candidatosDelArea, busquedaMiembro]);

  const alternarMiembro = (id: string) => {
    setMiembroIdsSeleccionados((prev) => (prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]));
  };

  const marcarTodos = () => setMiembroIdsSeleccionados(candidatosDelArea.map((c) => c.id));
  const desmarcarTodos = () => setMiembroIdsSeleccionados([]);

  const hayCambios = useMemo(() => {
    if (!supervisorSeleccionado) return false;
    const a = [...miembroIdsSeleccionados].sort();
    const b = [...equipoActual(supervisorSeleccionado)].sort();
    return a.length !== b.length || a.some((id, i) => id !== b[i]);
  }, [miembroIdsSeleccionados, supervisorSeleccionado, colaboradores]); // eslint-disable-line react-hooks/exhaustive-deps

  const guardar = async () => {
    if (!supervisorSeleccionado) return;
    setGuardando(true);
    setError("");

    const equipoAntes = new Set(equipoActual(supervisorSeleccionado));
    const equipoAhora = new Set(miembroIdsSeleccionados);
    const cambios: { id: string; supervisorId: string | null }[] = [];
    for (const c of candidatosDelArea) {
      const antes = equipoAntes.has(c.id);
      const ahora = equipoAhora.has(c.id);
      if (antes !== ahora) cambios.push({ id: c.id, supervisorId: ahora ? supervisorSeleccionado.id : null });
    }

    try {
      const resultados = await Promise.all(
        cambios.map((cambio) =>
          fetch(`/api/colaboradores/${cambio.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ supervisorId: cambio.supervisorId }),
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
      router.refresh();
    } catch {
      setError("No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.");
      toast.error("No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="flex-1 px-4 sm:px-8 py-5 space-y-4">
      <div className="flex flex-wrap items-baseline gap-2">
        <h1 className="text-lg sm:text-xl font-bold">Asignar equipo</h1>
        <span className="hidden sm:inline text-xs text-neutral-500 dark:text-neutral-400">
          · Elegí un supervisor y marcá quiénes de su área le reportan
        </span>
      </div>

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
          <input
            value={busqueda}
            onChange={(e) => cambiarBusqueda(e.target.value)}
            placeholder="Buscar supervisor por nombre o código..."
            className="w-full rounded-xl border border-neutral-300 bg-white text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white px-4 py-2.5 text-sm placeholder-neutral-500 focus:border-orange-400 focus:ring-2 focus:ring-orange-500/15 outline-none"
          />

          <div className="space-y-2">
            <ComboboxBuscable
              opciones={empresas}
              value={empresaFiltro}
              onChange={cambiarEmpresaFiltro}
              placeholder="Todas las empresas"
            />
            <ComboboxBuscable
              opciones={sitiosFiltro}
              value={sitioFiltro}
              onChange={cambiarSitioFiltro}
              placeholder="Todos los sitios"
            />
            <ComboboxBuscable
              opciones={areasFiltro}
              value={areaFiltro}
              onChange={cambiarAreaFiltro}
              placeholder="Todas las áreas"
            />
          </div>

          <div className="flex items-center justify-between gap-2 bg-white border border-neutral-200 dark:bg-neutral-900 dark:border-neutral-800 rounded-xl px-3.5 py-2.5">
            <ToggleSwitch checked={soloActivos} onChange={cambiarSoloActivos} label="Solo supervisores activos" />
          </div>

          <div className="bg-neutral-50 rounded-2xl overflow-hidden shadow-sm ring-1 ring-black/5">
            <div className="max-h-[480px] overflow-y-auto divide-y divide-neutral-200/70">
              {supervisoresPagina.map((c) => {
                const activo = c.id === supervisorSeleccionadoId;
                const cantidad = equipoActual(c).length;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => seleccionarSupervisor(c)}
                    className={`w-full text-left px-4 py-3 transition ${
                      activo ? "bg-orange-50" : "hover:bg-neutral-100/60"
                    }`}
                  >
                    <p className={`text-sm font-medium ${activo ? "text-orange-700" : "text-neutral-800"}`}>
                      {c.nombreCompleto}
                    </p>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      {c.codigoNomina ?? "Sin código"} · {c.areaNombre}
                    </p>
                    <p className="text-[11px] font-semibold mt-1 text-neutral-400">
                      {cantidad} persona{cantidad === 1 ? "" : "s"} a cargo
                    </p>
                  </button>
                );
              })}
              {supervisoresFiltrados.length === 0 && (
                <p className="px-4 py-10 text-center text-sm text-neutral-400">
                  {busqueda || empresaFiltro || sitioFiltro || areaFiltro
                    ? "Sin resultados para esos filtros"
                    : "No hay supervisores registrados"}
                </p>
              )}
            </div>
            <Paginacion paginaActual={paginaActual} totalPaginas={totalPaginas} onCambiarPagina={setPaginaActual} />
          </div>
        </div>

        {/* Columna derecha: equipo del supervisor seleccionado */}
        <div className="flex-1 min-w-0 w-full bg-neutral-50 rounded-2xl shadow-sm ring-1 ring-black/5 p-5">
          {!supervisorSeleccionado ? (
            <div className="py-16 text-center text-sm text-neutral-400">
              Elegí un supervisor de la lista para armar su equipo
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-bold text-neutral-900">{supervisorSeleccionado.nombreCompleto}</h2>
                <p className="text-xs text-neutral-500 mt-0.5">{supervisorSeleccionado.areaNombre}</p>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <input
                  value={busquedaMiembro}
                  onChange={(e) => setBusquedaMiembro(e.target.value)}
                  placeholder="Buscar colaborador..."
                  className="flex-1 rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 text-sm placeholder-neutral-400 focus:border-orange-400 focus:ring-2 focus:ring-orange-500/15 outline-none"
                />
                <div className="flex gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={marcarTodos}
                    className="text-xs font-medium text-neutral-600 border border-neutral-300 px-3 py-2 rounded-lg hover:bg-neutral-100 transition"
                  >
                    Marcar todos
                  </button>
                  <button
                    type="button"
                    onClick={desmarcarTodos}
                    className="text-xs font-medium text-neutral-600 border border-neutral-300 px-3 py-2 rounded-lg hover:bg-neutral-100 transition"
                  >
                    Ninguno
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-xl ring-1 ring-black/5 overflow-hidden">
                <div className="max-h-[380px] overflow-y-auto divide-y divide-neutral-100">
                  {candidatosVisibles.map((c) => {
                    const marcado = miembroIdsSeleccionados.includes(c.id);
                    const reportaAOtro =
                      !marcado && c.supervisorId && c.supervisorId !== supervisorSeleccionado.id;
                    return (
                      <label
                        key={c.id}
                        className="flex items-center gap-3 px-4 py-3 text-sm cursor-pointer hover:bg-neutral-50 transition"
                      >
                        <input
                          type="checkbox"
                          checked={marcado}
                          onChange={() => alternarMiembro(c.id)}
                          className="w-4 h-4 accent-orange-500 rounded shrink-0"
                        />
                        <span className="flex-1 min-w-0">
                          <span className="text-neutral-800">{c.nombreCompleto}</span>
                          {c.esSupervisor && (
                            <span className="ml-1.5 text-[10px] font-semibold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">
                              SUPERVISOR
                            </span>
                          )}
                          {reportaAOtro && (
                            <span className="block text-[11px] text-amber-600">
                              Actualmente reporta a otro supervisor
                            </span>
                          )}
                        </span>
                        <span className="text-neutral-400 text-xs shrink-0">{c.codigoNomina ?? "—"}</span>
                      </label>
                    );
                  })}
                  {candidatosVisibles.length === 0 && (
                    <p className="px-4 py-10 text-center text-sm text-neutral-400">
                      {candidatosDelArea.length === 0
                        ? "No hay más colaboradores en esta área"
                        : "Sin resultados para esa búsqueda"}
                    </p>
                  )}
                </div>
              </div>

              <p className="text-xs text-neutral-400">
                {miembroIdsSeleccionados.length} de {candidatosDelArea.length} colaboradores de su área le reportan a{" "}
                {supervisorSeleccionado.nombreCompleto.split(" ")[0]}.
              </p>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <div className="flex justify-end">
                <button
                  onClick={guardar}
                  disabled={guardando || !hayCambios}
                  className="px-5 py-2.5 text-sm font-semibold bg-orange-500 hover:bg-orange-600 text-white rounded-xl disabled:opacity-50 transition flex items-center justify-center gap-2"
                >
                  {guardando && <Spinner className="w-4 h-4" />}
                  {guardando ? "Guardando..." : "Guardar cambios"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
