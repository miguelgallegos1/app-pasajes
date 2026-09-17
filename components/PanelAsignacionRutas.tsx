// components/PanelAsignacionRutas.tsx
// Pantalla dedicada de "Asignar rutas": a la izquierda se filtra y elige un
// colaborador (Empresa/Sitio/Área + buscador), a la derecha se marca con
// checkboxes qué rutas de su área le quedan exclusivas. Reemplaza el
// MultiSelectBuscable que vivía escondido en el modal de Colaboradores.

"use client";

import { useState, useMemo } from "react";
import { formatearMoneda } from "../lib/formato";
import { useRouter } from "next/navigation";
import ComboboxBuscable from "./ComboboxBuscable";
import ToggleSwitch from "./ToggleSwitch";
import Paginacion from "./Paginacion";
import Spinner from "./Spinner";
import { useToast } from "./Toast";
import EstadoVacio from "./EstadoVacio";
import Avatar from "./Avatar";

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

const POR_PAGINA = 8;

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
        (c.codigoNomina ?? "").toLowerCase().includes(texto)
      );
    });
  }, [colaboradores, busqueda, soloActivos, empresaFiltro, sitioFiltro, areaFiltro]);

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

  const colaboradorSeleccionado = colaboradores.find((c) => c.id === colaboradorSeleccionadoId) ?? null;

  const seleccionarColaborador = (c: Colaborador) => {
    setColaboradorSeleccionadoId(c.id);
    setRutaIdsSeleccionadas(c.rutaIdsExclusivas);
    setBusquedaRuta("");
    setError("");
  };

  const rutasDelColaborador = useMemo(
    () => (colaboradorSeleccionado ? rutas.filter((r) => r.areaId === colaboradorSeleccionado.areaId) : []),
    [rutas, colaboradorSeleccionado]
  );

  const rutasVisibles = useMemo(() => {
    const texto = busquedaRuta.trim().toLowerCase();
    if (!texto) return rutasDelColaborador;
    return rutasDelColaborador.filter((r) => r.nombre.toLowerCase().includes(texto));
  }, [rutasDelColaborador, busquedaRuta]);

  const alternarRuta = (id: string) => {
    setRutaIdsSeleccionadas((prev) => (prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]));
  };

  const marcarTodas = () => setRutaIdsSeleccionadas(rutasDelColaborador.map((r) => r.id));
  const desmarcarTodas = () => setRutaIdsSeleccionadas([]);

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

  return (
    <div className="flex-1 px-4 sm:px-8 py-5 space-y-4">
      <div className="flex flex-wrap items-baseline gap-2">
        <h1 className="text-lg sm:text-xl font-bold">Asignar rutas</h1>
        <span className="hidden sm:inline text-xs text-neutral-500 dark:text-neutral-400">
          · Elegí un colaborador y marcá qué rutas le quedan exclusivas a él
        </span>
      </div>

      {sinAsignaciones && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-xl px-4 py-3">
          No tienes ninguna Empresa/Sitio/Área asignada todavía.
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-4 items-start">
        {/* Columna izquierda: filtros + lista de colaboradores */}
        <div className="w-full lg:w-[380px] shrink-0 space-y-3">
          <input
            value={busqueda}
            onChange={(e) => cambiarBusqueda(e.target.value)}
            placeholder="Buscar por nombre o código..."
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
            <ToggleSwitch checked={soloActivos} onChange={cambiarSoloActivos} label="Solo activos" />
          </div>

          <div className="bg-neutral-50 dark:bg-neutral-900 rounded-2xl overflow-hidden shadow-sm ring-1 ring-black/5 dark:ring-white/10">
            <div className="max-h-[480px] overflow-y-auto divide-y divide-neutral-200/70">
              {colaboradoresPagina.map((c) => {
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
                      <Avatar nombre={c.nombreCompleto} className="w-8 h-8 text-xs mt-0.5" />
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
                            <span className="text-neutral-400 dark:text-neutral-500">Todas las rutas del área</span>
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
              Elegí un colaborador de la lista para asignarle sus rutas
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-bold text-neutral-900 dark:text-white">{colaboradorSeleccionado.nombreCompleto}</h2>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">{colaboradorSeleccionado.areaNombre}</p>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <input
                  value={busquedaRuta}
                  onChange={(e) => setBusquedaRuta(e.target.value)}
                  placeholder="Buscar ruta..."
                  className="flex-1 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white px-3.5 py-2.5 text-sm placeholder-neutral-400 focus:border-orange-400 focus:ring-2 focus:ring-orange-500/15 outline-none"
                />
                <div className="flex gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={marcarTodas}
                    className="text-xs font-medium text-neutral-600 dark:text-neutral-300 border border-neutral-300 dark:border-neutral-700 px-3 py-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
                  >
                    Marcar todas
                  </button>
                  <button
                    type="button"
                    onClick={desmarcarTodas}
                    className="text-xs font-medium text-neutral-600 dark:text-neutral-300 border border-neutral-300 dark:border-neutral-700 px-3 py-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
                  >
                    Ninguna
                  </button>
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
                            : "Sin resultados para esa búsqueda"
                        }
                      />
                    </div>
                  )}
                </div>
              </div>

              <p className="text-xs text-neutral-400 dark:text-neutral-500">
                {rutaIdsSeleccionadas.length === 0
                  ? "Sin ninguna marcada, sigue viendo todas las rutas del área (como siempre)."
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
