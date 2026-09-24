// components/PanelSolicitudesTH.tsx
// Pantalla dedicada de "Crear solicitud" para TH: a la izquierda se filtra
// y elige un colaborador (Empresa/Sitio/Área + buscador) de TODO su
// alcance — no hace falta que sea su supervisor directo —, a la derecha se
// eligen fecha y rutas para registrarle una o más solicitudes. Mismo
// patrón que Asignar rutas, reutilizando FilaRutasSeleccionables de
// "Nueva solicitud" para la lista de rutas con observación plegable.

"use client";

import { useState, useMemo, useEffect } from "react";
import { formatearMoneda } from "../lib/formato";
import { formatearFecha, fechaHoyTexto } from "../lib/fechas";
import { useFiltroEmpresaSitioArea } from "../lib/useFiltroEmpresaSitioArea";
import CalendarioSelector from "./CalendarioSelector";
import { useFechaMinimaSolicitud } from "./useFechaMinimaSolicitud";
import ComboboxBuscable from "./ComboboxBuscable";
import ToggleSwitch from "./ToggleSwitch";
import Paginacion from "./Paginacion";
import Modal from "./Modal";
import Spinner from "./Spinner";
import { useReportarCarga } from "../lib/cargaGlobal";
import { useToast } from "./Toast";
import EstadoVacio from "./EstadoVacio";
import Avatar from "./Avatar";
import FilaRutasSeleccionables, { type RutaSimple } from "./FilaRutasSeleccionables";
import { IconoLupa, IconoChevron, IconoPregunta } from "./Icons";

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
};

type Opcion = { id: string; label: string };
type Sitio = { id: string; nombre: string; empresaId: string };
type Area = { id: string; nombre: string; sitioId: string; empresaId: string };

const POR_PAGINA = 15;

export default function PanelSolicitudesTH() {
  const toast = useToast();

  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [rutasPorColaborador, setRutasPorColaborador] = useState<Record<string, RutaSimple[]>>({});
  const [empresas, setEmpresas] = useState<Opcion[]>([]);
  const [sitios, setSitios] = useState<Sitio[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [sinAsignaciones, setSinAsignaciones] = useState(false);
  const [cargandoInicial, setCargandoInicial] = useState(true);
  const [errorInicial, setErrorInicial] = useState("");
  useReportarCarga(cargandoInicial);

  const cargarDatos = async () => {
    try {
      const res = await fetch("/api/th/solicitudes/datos");
      if (!res.ok) {
        setErrorInicial("No se pudo cargar la información. Intenta de nuevo.");
        return;
      }
      const data = await res.json();
      setColaboradores(data.colaboradores);
      setRutasPorColaborador(data.rutasPorColaborador);
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
    fetch("/api/th/solicitudes/datos")
      .then(async (res) => {
        if (cancelado) return;
        if (!res.ok) {
          setErrorInicial("No se pudo cargar la información. Intenta de nuevo.");
          return;
        }
        const data = await res.json();
        setColaboradores(data.colaboradores);
        setRutasPorColaborador(data.rutasPorColaborador);
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
  const [soloActivos, setSoloActivos] = useState(true);
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
    cantidadFiltrosActivos,
  } = useFiltroEmpresaSitioArea(sitios, areas, resetPagina);
  // Colapsados por defecto: Empresa/Sitio/Área ocupan bastante espacio y
  // no siempre hacen falta — se abren solo cuando el usuario los pide.
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false);

  const cambiarBusqueda = (v: string) => { setBusqueda(v); resetPagina(); };
  const cambiarSoloActivos = (v: boolean) => { setSoloActivos(v); resetPagina(); };

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
  const [fecha, setFecha] = useState(fechaHoyTexto());
  const [rutaIdsElegidas, setRutaIdsElegidas] = useState<string[]>([]);
  const [observacionesPorRuta, setObservacionesPorRuta] = useState<Record<string, string>>({});
  const [observacionAbiertaClave, setObservacionAbiertaClave] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");

  const colaboradorSeleccionado = colaboradores.find((c) => c.id === colaboradorSeleccionadoId) ?? null;
  const rutasDelColaborador = useMemo(
    () => (colaboradorSeleccionadoId ? rutasPorColaborador[colaboradorSeleccionadoId] ?? [] : []),
    [colaboradorSeleccionadoId, rutasPorColaborador]
  );

  const seleccionarColaborador = (c: Colaborador) => {
    setColaboradorSeleccionadoId(c.id);
    setRutaIdsElegidas([]);
    setObservacionesPorRuta({});
    setObservacionAbiertaClave(null);
    setError("");
  };

  const claveItem = (idColaborador: string, idRuta: string) => `${idColaborador}::${idRuta}`;
  const alternarRuta = (rutaId: string) => {
    setRutaIdsElegidas((prev) => (prev.includes(rutaId) ? prev.filter((r) => r !== rutaId) : [...prev, rutaId]));
  };
  const cambiarObservacion = (rutaId: string, valor: string) => {
    if (!colaboradorSeleccionadoId) return;
    setObservacionesPorRuta((prev) => ({ ...prev, [claveItem(colaboradorSeleccionadoId, rutaId)]: valor }));
  };
  const alternarObservacion = (clave: string) => {
    setObservacionAbiertaClave((prev) => (prev === clave ? null : clave));
  };

  const totalElegido = useMemo(
    () =>
      rutaIdsElegidas.reduce((acc, rId) => {
        const ruta = rutasDelColaborador.find((r) => r.id === rId);
        return acc + (ruta?.valor ?? 0);
      }, 0),
    [rutaIdsElegidas, rutasDelColaborador]
  );

  const fechaMinima = useFechaMinimaSolicitud();

  const confirmarRegistro = async () => {
    if (!colaboradorSeleccionadoId) return;
    setEnviando(true);
    setError("");
    const items = rutaIdsElegidas.map((rutaId) => ({
      colaboradorId: colaboradorSeleccionadoId,
      rutaId,
      observaciones: observacionesPorRuta[claveItem(colaboradorSeleccionadoId, rutaId)] ?? "",
    }));
    try {
      const res = await fetch("/api/solicitudes/crear-lote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fecha, items }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "No se pudo registrar la solicitud");
        toast.error(data.error ?? "No se pudo registrar la solicitud");
        return;
      }
      const n = data.creadas ?? items.length;
      toast.exito(`${n} solicitud${n === 1 ? "" : "es"} registrada${n === 1 ? "" : "s"} para ${colaboradorSeleccionado?.nombreCompleto}`);
      setConfirmando(false);
      setRutaIdsElegidas([]);
      setObservacionesPorRuta({});
      setObservacionAbiertaClave(null);
      await cargarDatos();
    } catch {
      setError("No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.");
      toast.error("No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setEnviando(false);
    }
  };

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

      <div className="flex flex-col lg:flex-row gap-4 items-start">
        {/* Columna izquierda: filtros + lista de colaboradores */}
        <div className="w-full lg:w-[380px] shrink-0 space-y-3">
          {/* overflow-hidden solo cuando está colapsado: para recortar el
              botón a las esquinas redondeadas. Abierto, el desplegable de
              cada ComboboxBuscable (position: absolute) necesita salirse
              del recuadro para poder verse — con overflow-hidden puesto
              quedaba invisible, cortado por este mismo contenedor. */}
          <div className={`bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl ${filtrosAbiertos ? "" : "overflow-hidden"}`}>
            <button
              type="button"
              onClick={() => setFiltrosAbiertos((v) => !v)}
              className={`w-full flex items-center justify-between gap-2 px-3.5 py-2.5 text-sm text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800/60 transition ${filtrosAbiertos ? "rounded-t-xl" : "rounded-xl"}`}
            >
              <span className="flex items-center gap-2">
                Filtrar por Empresa / Sitio / Área
                {cantidadFiltrosActivos > 0 && (
                  <span className="text-[11px] font-semibold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-500/10 px-1.5 py-0.5 rounded-full">
                    {cantidadFiltrosActivos}
                  </span>
                )}
              </span>
              <IconoChevron className={`w-4 h-4 text-neutral-400 dark:text-neutral-500 shrink-0 transition-transform ${filtrosAbiertos ? "rotate-90" : ""}`} />
            </button>
            {filtrosAbiertos && (
              <div className="px-3.5 pb-3.5 pt-1 space-y-2 border-t border-neutral-100 dark:border-neutral-800">
                <ComboboxBuscable
                  opciones={empresas}
                  value={empresaFiltro}
                  onChange={cambiarEmpresaFiltro}
                  placeholder="Todos"
                />
                <ComboboxBuscable
                  opciones={sitiosFiltro}
                  value={sitioFiltro}
                  onChange={cambiarSitioFiltro}
                  placeholder="Todos"
                />
                <ComboboxBuscable
                  opciones={areasFiltro}
                  value={areaFiltro}
                  onChange={cambiarAreaFiltro}
                  placeholder="Todos"
                />
              </div>
            )}
          </div>

          <div className="relative">
            <IconoLupa className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 dark:text-neutral-500 pointer-events-none" />
            <input
              value={busqueda}
              onChange={(e) => cambiarBusqueda(e.target.value)}
              placeholder="Buscar por nombre o código..."
              className="w-full rounded-xl border border-neutral-300 bg-white text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white pl-10 pr-4 py-2.5 text-sm placeholder-neutral-500 focus:border-orange-400 focus:ring-2 focus:ring-orange-500/15 outline-none"
            />
          </div>

          <div className="flex items-center justify-between gap-2 bg-white border border-neutral-200 dark:bg-neutral-900 dark:border-neutral-800 rounded-xl px-3.5 py-2.5">
            <ToggleSwitch checked={soloActivos} onChange={cambiarSoloActivos} label="Solo activos" />
          </div>

          <div className="bg-neutral-50 dark:bg-neutral-900 rounded-2xl overflow-hidden shadow-sm ring-1 ring-black/5 dark:ring-white/10">
            <div className="max-h-[480px] overflow-y-auto divide-y divide-neutral-200/70">
              {colaboradoresPagina.map((c, i) => {
                const activo = c.id === colaboradorSeleccionadoId;
                const cantidadRutas = (rutasPorColaborador[c.id] ?? []).length;
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
                          {cantidadRutas > 0 ? (
                            <span className="text-orange-600">{cantidadRutas} ruta{cantidadRutas === 1 ? "" : "s"} asignada{cantidadRutas === 1 ? "" : "s"}</span>
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

        {/* Columna derecha: fecha + rutas del colaborador seleccionado */}
        <div className="flex-1 min-w-0 w-full bg-neutral-50 dark:bg-neutral-900 rounded-2xl shadow-sm ring-1 ring-black/5 dark:ring-white/10 p-5">
          {!colaboradorSeleccionado ? (
            <div className="py-16 text-center text-sm text-neutral-400 dark:text-neutral-500">
              Elegir un colaborador de la lista para registrarle una solicitud
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-bold text-neutral-900 dark:text-white">{colaboradorSeleccionado.nombreCompleto}</h2>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">{colaboradorSeleccionado.areaNombre}</p>
              </div>

              <div className="max-w-xs">
                <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Fecha</label>
                <div className="mt-1.5">
                  <CalendarioSelector value={fecha} onChange={setFecha} fechaMinima={fechaMinima} />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Rutas</label>
                <div className="mt-1.5 rounded-xl ring-1 ring-black/5 dark:ring-white/10 overflow-hidden max-h-[360px] overflow-y-auto divide-y divide-neutral-100 dark:divide-neutral-800 bg-white dark:bg-neutral-900">
                  <FilaRutasSeleccionables
                    rutas={rutasDelColaborador}
                    elegidas={rutaIdsElegidas}
                    onAlternarRuta={alternarRuta}
                    observaciones={observacionesPorRuta}
                    onCambiarObservacion={cambiarObservacion}
                    claveItem={claveItem}
                    colaboradorId={colaboradorSeleccionadoId!}
                    observacionAbiertaClave={observacionAbiertaClave}
                    onAlternarObservacion={alternarObservacion}
                  />
                </div>
              </div>

              {rutaIdsElegidas.length > 0 && (
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Se van a registrar <span className="font-semibold text-neutral-700 dark:text-neutral-200">{rutaIdsElegidas.length} solicitud{rutaIdsElegidas.length === 1 ? "" : "es"}</span> por un total de{" "}
                  <span className="font-semibold text-neutral-700 dark:text-neutral-200">{formatearMoneda(totalElegido)}</span>.
                </p>
              )}

              {error && <p className="text-sm text-red-600">{error}</p>}

              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={!fecha || rutaIdsElegidas.length === 0}
                  onClick={() => setConfirmando(true)}
                  className="px-5 py-2.5 text-sm font-semibold bg-orange-500 hover:bg-orange-600 text-white rounded-xl disabled:opacity-40 transition shadow-sm hover:shadow-md"
                >
                  Registrar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
        </>
      )}

      <Modal abierto={confirmando} onCerrar={() => setConfirmando(false)} onConfirmar={confirmarRegistro} variante="centro" className="bg-white dark:bg-neutral-900 text-black dark:text-white rounded-3xl p-7 w-full max-w-xs text-center space-y-4 shadow-2xl">
        <div className="w-12 h-12 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center mx-auto"><IconoPregunta className="w-6 h-6" /></div>
        <p className="font-semibold text-neutral-900 dark:text-white">
          ¿Registrar {rutaIdsElegidas.length} solicitud{rutaIdsElegidas.length === 1 ? "" : "es"} para {colaboradorSeleccionado?.nombreCompleto}?
        </p>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          {fecha && formatearFecha(fecha)} · {formatearMoneda(totalElegido)}
        </p>
        {error && <p className="text-sm text-red-600">{error}</p>}
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
            {enviando ? "Guardando..." : "Sí, guardar"}
          </button>
        </div>
      </Modal>
    </div>
  );
}
