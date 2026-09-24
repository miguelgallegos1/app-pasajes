// components/PanelAsignacionRutas.tsx
// Pantalla dedicada de "Asignar rutas": a la izquierda se filtra y elige un
// colaborador (Empresa/Sitio/Área + buscador), a la derecha se marca con
// checkboxes qué rutas de su área puede usar. Son las ÚNICAS rutas que ve
// ese colaborador (ver lib/rutas.ts) — sin ninguna marcada, no ve ninguna.
// Reemplaza el MultiSelectBuscable que vivía escondido en el modal de
// Colaboradores.

"use client";

import { useState, useMemo } from "react";
import { formatearMoneda } from "../lib/formato";
import { useRouter } from "next/navigation";
import { useFiltroEmpresaSitioArea } from "../lib/useFiltroEmpresaSitioArea";
import Paginacion from "./Paginacion";
import Spinner from "./Spinner";
import { useToast } from "./Toast";
import EstadoVacio from "./EstadoVacio";
import Avatar from "./Avatar";
import { IconoLupa, IconoDescargar, IconoCheck, IconoX, IconoRuta } from "./Icons";
import BarraFiltros, { CampoEstadoActivo, CamposEmpresaSitioArea, chipEstadoActivo, chips, chipsEmpresaSitioArea, cumpleFiltroActivo, type FiltroActivo } from "./BarraFiltros";
import { useAccionesHeader } from "../lib/accionesHeader";

type Colaborador = {
  id: string;
  numero: number;
  nombreCompleto: string;
  codigoNomina: string | null;
  estado: string;
  areaId: string;
  areaNombre: string;
  sitioId: string;
  empresaId: string;
  rutaIdsExclusivas: string[];
};

type Ruta = { id: string; nombre: string; valor: number; areaId: string };
type Opcion = { id: string; label: string };
type Sitio = { id: string; nombre: string; empresaId: string };
type Area = { id: string; nombre: string; sitioId: string; empresaId: string };

const POR_PAGINA = 15;

export default function PanelAsignacionRutas({
  colaboradores,
  rutas,
  empresas,
  sitios,
  areas,
  sinAsignaciones,
}: {
  colaboradores: Colaborador[];
  rutas: Ruta[];
  empresas: Opcion[];
  sitios: Sitio[];
  areas: Area[];
  sinAsignaciones: boolean;
}) {
  const router = useRouter();
  const toast = useToast();

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
        (c.codigoNomina ?? "").toLowerCase().includes(texto)
      );
    });
  }, [colaboradores, busqueda, estadoFiltro, empresaFiltro, sitioFiltro, areaFiltro]);

  const totalPaginas = Math.max(1, Math.ceil(colaboradoresFiltrados.length / POR_PAGINA));
  const colaboradoresPagina = useMemo(
    () => colaboradoresFiltrados.slice((paginaActual - 1) * POR_PAGINA, paginaActual * POR_PAGINA),
    [colaboradoresFiltrados, paginaActual]
  );

  const [colaboradorSeleccionadoId, setColaboradorSeleccionadoId] = useState<string | null>(null);
  const [rutaIdsSeleccionadas, setRutaIdsSeleccionadas] = useState<string[]>([]);
  const [busquedaRuta, setBusquedaRuta] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  // Filtro "Ver solo asignadas": junto a Marcar todas/Ninguna, para ver de
  // un vistazo qué rutas tiene YA marcadas sin tener que buscarlas entre
  // todas las del área. Solo aparece si tiene al menos una asignada — sin
  // ninguna, no tendría nada que mostrar.
  const [verSoloAsignadas, setVerSoloAsignadas] = useState(false);

  const colaboradorSeleccionado = colaboradores.find((c) => c.id === colaboradorSeleccionadoId) ?? null;

  const seleccionarColaborador = (c: Colaborador) => {
    setColaboradorSeleccionadoId(c.id);
    setRutaIdsSeleccionadas(c.rutaIdsExclusivas);
    setBusquedaRuta("");
    setError("");
    setVerSoloAsignadas(false);
  };

  const rutasDelColaborador = useMemo(
    () => (colaboradorSeleccionado ? rutas.filter((r) => r.areaId === colaboradorSeleccionado.areaId) : []),
    [rutas, colaboradorSeleccionado]
  );

  const rutasVisibles = useMemo(() => {
    const texto = busquedaRuta.trim().toLowerCase();
    let base = rutasDelColaborador;
    if (verSoloAsignadas) base = base.filter((r) => rutaIdsSeleccionadas.includes(r.id));
    if (!texto) return base;
    return base.filter((r) => r.nombre.toLowerCase().includes(texto));
  }, [rutasDelColaborador, busquedaRuta, verSoloAsignadas, rutaIdsSeleccionadas]);

  const alternarRuta = (id: string) => {
    setRutaIdsSeleccionadas((prev) => (prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]));
  };

  // "Marcar todas"/"Ninguna" actúan sobre lo que está BUSCADO en pantalla
  // (rutasVisibles), no sobre todas las rutas del área — así no hace falta
  // ir tildando una por una cuando ya filtraste por nombre. Se suman/restan
  // sobre la selección existente en vez de reemplazarla, para no perder lo
  // marcado en una búsqueda anterior.
  const marcarTodas = () => {
    const idsVisibles = rutasVisibles.map((r) => r.id);
    setRutaIdsSeleccionadas((prev) => Array.from(new Set([...prev, ...idsVisibles])));
  };
  const desmarcarTodas = () => {
    const idsVisibles = new Set(rutasVisibles.map((r) => r.id));
    setRutaIdsSeleccionadas((prev) => prev.filter((id) => !idsVisibles.has(id)));
  };

  const hayCambios = useMemo(() => {
    if (!colaboradorSeleccionado) return false;
    const a = [...rutaIdsSeleccionadas].sort();
    const b = [...colaboradorSeleccionado.rutaIdsExclusivas].sort();
    return a.length !== b.length || a.some((id, i) => id !== b[i]);
  }, [rutaIdsSeleccionadas, colaboradorSeleccionado]);

  const guardar = async () => {
    if (!colaboradorSeleccionado) return;
    setGuardando(true);
    setError("");
    try {
      const res = await fetch(`/api/colaboradores/${colaboradorSeleccionado.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rutaIds: rutaIdsSeleccionadas }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "No se pudo guardar");
        toast.error(data.error ?? "No se pudieron guardar las rutas");
        return;
      }
      toast.exito("Rutas actualizadas");
      router.refresh();
    } catch {
      setError("No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.");
      toast.error("No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setGuardando(false);
    }
  };

  // Mismos filtros de Empresa/Sitio/Área (y Estado) que la lista
  // de la izquierda: sin ningún filtro puesto, exporta todo el alcance de
  // TH; con un filtro puesto, exporta solo eso — el Excel es exactamente
  // lo que se está viendo en pantalla.
  const urlExportar = () => {
    const params = new URLSearchParams();
    if (empresaFiltro) params.set("empresaId", empresaFiltro);
    if (sitioFiltro) params.set("sitioId", sitioFiltro);
    if (areaFiltro) params.set("areaId", areaFiltro);
    if (estadoFiltro !== "ACTIVO") params.set("estado", estadoFiltro || "TODOS");
    return `/api/th/rutas/asignaciones/exportar?${params.toString()}`;
  };

  useAccionesHeader(
    <>
      <a
        href={urlExportar()}
        className="inline-flex items-center justify-center gap-1.5 text-xs sm:text-sm font-semibold text-neutral-700 dark:text-neutral-300 border border-neutral-300 dark:border-neutral-700 hover:border-orange-400 hover:text-orange-600 px-3 py-2 rounded-lg transition"
      >
        <IconoDescargar className="w-4 h-4" /> Exportar a Excel
      </a>
      <button
        onClick={() => router.push("/th/rutas?nueva=1")}
        className="text-xs sm:text-sm font-semibold bg-orange-500 hover:bg-orange-600 text-black px-3 py-2 rounded-lg transition shadow-sm hover:shadow-md hover:-translate-y-0.5"
      >
        + Nueva ruta
      </button>
    </>
  );

  return (
    <div className="flex-1 px-4 sm:px-8 pb-5 space-y-4">
      {sinAsignaciones && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-xl px-4 py-3">
          No tienes ninguna Empresa/Sitio/Área asignada todavía.
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-4 items-start">
        {/* Columna izquierda: filtros + lista de colaboradores */}
        <div className="w-full lg:w-[380px] shrink-0 space-y-3">
          <BarraFiltros
            busqueda={{ valor: busqueda, onCambiar: cambiarBusqueda, placeholder: "Buscar por nombre o código..." }}
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

          <div className="bg-neutral-50 dark:bg-neutral-900 rounded-2xl overflow-hidden shadow-sm ring-1 ring-black/5 dark:ring-white/10">
            <div className="max-h-[480px] overflow-y-auto divide-y divide-neutral-200/70">
              {colaboradoresPagina.map((c, i) => {
                const activo = c.id === colaboradorSeleccionadoId;
                const cantidad = c.rutaIdsExclusivas.length;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => seleccionarColaborador(c)}
                    className={`w-full text-left px-4 py-3 transition ${
                      activo ? "bg-orange-50 dark:bg-orange-500/10" : "hover:bg-neutral-100/60 dark:hover:bg-neutral-800/60"
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <Avatar nombre={c.nombreCompleto} indice={i} className="w-8 h-8 text-xs mt-0.5" />
                      <div className="min-w-0">
                        <p className={`text-sm font-medium truncate ${activo ? "text-orange-700" : "text-neutral-800 dark:text-neutral-200"}`}>
                          {c.nombreCompleto}
                        </p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                          {c.codigoNomina ?? "Sin código"} · {c.areaNombre}
                        </p>
                        <p className="text-[11px] font-semibold mt-1">
                          {cantidad > 0 ? (
                            <span className="text-orange-600">{cantidad} ruta{cantidad === 1 ? "" : "s"} exclusiva{cantidad === 1 ? "" : "s"}</span>
                          ) : (
                            <span className="text-amber-600">Sin rutas asignadas</span>
                          )}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
              {colaboradoresFiltrados.length === 0 && (
                <div className="px-4 py-10">
                  <EstadoVacio
                    mensaje={
                      busqueda || empresaFiltro || sitioFiltro || areaFiltro
                        ? "Sin resultados para esos filtros"
                        : "Aún no hay colaboradores registrados"
                    }
                  />
                </div>
              )}
            </div>
            <Paginacion paginaActual={paginaActual} totalPaginas={totalPaginas} onCambiarPagina={setPaginaActual} />
          </div>
        </div>

        {/* Columna derecha: rutas del colaborador seleccionado */}
        <div className="flex-1 min-w-0 w-full bg-neutral-50 dark:bg-neutral-900 rounded-2xl shadow-sm ring-1 ring-black/5 dark:ring-white/10 p-5">
          {!colaboradorSeleccionado ? (
            <div className="py-16 text-center text-sm text-neutral-400 dark:text-neutral-500">
              Elegir un colaborador de la lista para asignarle sus rutas
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-bold text-neutral-900 dark:text-white">{colaboradorSeleccionado.nombreCompleto}</h2>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">{colaboradorSeleccionado.areaNombre}</p>
              </div>

              <div className="flex flex-col gap-2">
                <div className="relative">
                  <IconoLupa className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 dark:text-neutral-500 pointer-events-none" />
                  <input
                    value={busquedaRuta}
                    onChange={(e) => setBusquedaRuta(e.target.value)}
                    placeholder="Buscar ruta..."
                    className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white pl-10 pr-3.5 py-2.5 text-sm placeholder-neutral-400 focus:border-orange-400 focus:ring-2 focus:ring-orange-500/15 outline-none"
                  />
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={marcarTodas}
                    title="Marcar todas las que se ven en la lista"
                    className="flex items-center gap-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-300 border border-neutral-300 dark:border-neutral-700 px-3 py-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
                  >
                    <IconoCheck className="w-3.5 h-3.5" /> Todas
                  </button>
                  <button
                    type="button"
                    onClick={desmarcarTodas}
                    title="Desmarcar todas las que se ven en la lista"
                    className="flex items-center gap-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-300 border border-neutral-300 dark:border-neutral-700 px-3 py-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
                  >
                    <IconoX className="w-3.5 h-3.5" /> Ninguna
                  </button>
                  {colaboradorSeleccionado.rutaIdsExclusivas.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setVerSoloAsignadas((v) => !v)}
                      title="Ver solo las rutas que ya tiene asignadas"
                      className={`flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg border transition ${
                        verSoloAsignadas
                          ? "bg-orange-500 border-orange-500 text-white hover:bg-orange-600"
                          : "text-neutral-600 dark:text-neutral-300 border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                      }`}
                    >
                      <IconoRuta className="w-3.5 h-3.5" /> {verSoloAsignadas ? "Viendo asignadas" : "Asignadas"}
                    </button>
                  )}
                </div>
              </div>

              <div className="bg-white dark:bg-neutral-900 rounded-xl ring-1 ring-black/5 dark:ring-white/10 overflow-hidden">
                <div className="max-h-[380px] overflow-y-auto divide-y divide-neutral-100">
                  {rutasVisibles.map((r) => {
                    const marcada = rutaIdsSeleccionadas.includes(r.id);
                    return (
                      <label
                        key={r.id}
                        className="flex items-center gap-3 px-4 py-3 text-sm cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/60 transition"
                      >
                        <input
                          type="checkbox"
                          checked={marcada}
                          onChange={() => alternarRuta(r.id)}
                          className="w-4 h-4 accent-orange-500 rounded shrink-0"
                        />
                        <span className="flex-1 text-neutral-800 dark:text-neutral-200">{r.nombre}</span>
                        <span className="text-neutral-400 dark:text-neutral-500 text-xs">{formatearMoneda(r.valor)}</span>
                      </label>
                    );
                  })}
                  {rutasVisibles.length === 0 && (
                    <div className="px-4 py-10">
                      <EstadoVacio
                        mensaje={
                          rutasDelColaborador.length === 0
                            ? "Esta área no tiene rutas activas"
                            : verSoloAsignadas
                              ? "No tiene ninguna ruta asignada"
                              : "Sin resultados para esa búsqueda"
                        }
                      />
                    </div>
                  )}
                </div>
              </div>

              <p className={`text-xs ${rutaIdsSeleccionadas.length === 0 ? "text-amber-600 dark:text-amber-500 font-medium" : "text-neutral-400 dark:text-neutral-500"}`}>
                {rutaIdsSeleccionadas.length === 0
                  ? "Sin ninguna marcada, no va a poder ver ni registrar ninguna ruta hasta que le asignes al menos una."
                  : `Solo va a ver ${rutaIdsSeleccionadas.length} de las ${rutasDelColaborador.length} rutas de su área.`}
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
