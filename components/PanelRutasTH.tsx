// components/PanelRutasTH.tsx
// CRUD de Rutas: buscador, switch "solo activas" (encendido por defecto),
// paginación, y modal "Gestionar" que separa Desactivar/Reactivar de Eliminar.

"use client";

import { useState, useMemo, useEffect } from "react";
import { formatearMoneda } from "../lib/formato";
import { IconoAlerta, IconoLupa, IconoChevron } from "./Icons";
import EstadoVacio from "./EstadoVacio";
import ComboboxBuscable from "./ComboboxBuscable";
import ToggleSwitch from "./ToggleSwitch";
import Paginacion from "./Paginacion";
import Modal from "./Modal";
import Spinner from "./Spinner";
import { useToast } from "./Toast";
import MenuAcciones from "./MenuAcciones";
import EncabezadoOrdenable from "./EncabezadoOrdenable";
import { useOrdenTabla } from "../lib/useOrdenTabla";
import { useFiltroEmpresaSitioArea } from "../lib/useFiltroEmpresaSitioArea";

type Ruta = {
  id: string;
  numero: number;
  nombre: string;
  valor: number;
  activo: boolean;
  empresaId: string;
  sitioId: string;
  areaId: string;
  areaLabel: string;
  tieneSolicitudes: boolean;
  colaboradoresExclusivosNombres: string[];
};
type Opcion = { id: string; label: string };
type Sitio = { id: string; nombre: string; empresaId: string };
type Area = { id: string; nombre: string; sitioId: string };

type CampoOrden = "numero" | "nombre" | "valor" | "activo";
const VALOR_ORDEN: Record<CampoOrden, (r: Ruta) => string | number> = {
  numero: (r) => r.numero,
  nombre: (r) => r.nombre,
  valor: (r) => r.valor,
  activo: (r) => (r.activo ? 1 : 0),
};

const POR_PAGINA = 10;

export default function PanelRutasTH() {
  const toast = useToast();

  const [rutas, setRutas] = useState<Ruta[]>([]);
  const [areasDisponibles, setAreasDisponibles] = useState<Opcion[]>([]);
  const [empresas, setEmpresas] = useState<Opcion[]>([]);
  const [sitios, setSitios] = useState<Sitio[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [sinAsignaciones, setSinAsignaciones] = useState(false);
  const [esSuperAdmin, setEsSuperAdmin] = useState(false);
  const [cargandoInicial, setCargandoInicial] = useState(true);
  const [errorInicial, setErrorInicial] = useState("");

  const cargarDatos = async () => {
    try {
      const res = await fetch("/api/th/rutas/datos");
      if (!res.ok) {
        setErrorInicial("No se pudo cargar la información. Intenta de nuevo.");
        return;
      }
      const data = await res.json();
      setRutas(data.rutas);
      setAreasDisponibles(data.areasDisponibles);
      setEmpresas(data.empresas);
      setSitios(data.sitios);
      setAreas(data.areas);
      setSinAsignaciones(data.sinAsignaciones);
      setEsSuperAdmin(data.esSuperAdmin);
      setErrorInicial("");
    } catch {
      setErrorInicial("No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.");
    }
  };

  useEffect(() => {
    let cancelado = false;
    fetch("/api/th/rutas/datos")
      .then(async (res) => {
        if (cancelado) return;
        if (!res.ok) {
          setErrorInicial("No se pudo cargar la información. Intenta de nuevo.");
          return;
        }
        const data = await res.json();
        setRutas(data.rutas);
        setAreasDisponibles(data.areasDisponibles);
        setEmpresas(data.empresas);
        setSitios(data.sitios);
        setAreas(data.areas);
        setSinAsignaciones(data.sinAsignaciones);
        setEsSuperAdmin(data.esSuperAdmin);
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
  const [soloActivas, setSoloActivas] = useState(true);
  const [paginaActual, setPaginaActual] = useState(1);
  const resetPagina = () => setPaginaActual(1);

  // Al eliminar, la fila se oculta al instante (no depende de que
  // cargarDatos() termine su viaje de ida y vuelta al servidor, que con
  // Neon puede demorar un poco) — así que buscar o filtrar justo después
  // de borrar ya no la muestra, aunque la lista de servidor recién esté
  // poniéndose al día. Mismo patrón que "Mis Pasajes" al eliminar una
  // solicitud.
  const [idsOcultos, setIdsOcultos] = useState<Set<string>>(new Set());
  const rutasVisiblesDeServidor = useMemo(
    () => (idsOcultos.size === 0 ? rutas : rutas.filter((r) => !idsOcultos.has(r.id))),
    [rutas, idsOcultos]
  );

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

  const rutasFiltradas = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return rutasVisiblesDeServidor.filter((r) => {
      if (soloActivas && !r.activo) return false;
      if (empresaFiltro && r.empresaId !== empresaFiltro) return false;
      if (sitioFiltro && r.sitioId !== sitioFiltro) return false;
      if (areaFiltro && r.areaId !== areaFiltro) return false;
      if (!texto) return true;
      return r.nombre.toLowerCase().includes(texto) || r.areaLabel.toLowerCase().includes(texto);
    });
  }, [rutasVisiblesDeServidor, busqueda, soloActivas, empresaFiltro, sitioFiltro, areaFiltro]);

  const { orden, ordenar, itemsOrdenados: rutasOrdenadas } = useOrdenTabla<Ruta, CampoOrden>(
    rutasFiltradas,
    (r, campo) => VALOR_ORDEN[campo](r),
    "th-rutas",
    { valor: "desc" }
  );

  const totalPaginas = Math.max(1, Math.ceil(rutasOrdenadas.length / POR_PAGINA));
  const rutasPagina = useMemo(
    () => rutasOrdenadas.slice((paginaActual - 1) * POR_PAGINA, paginaActual * POR_PAGINA),
    [rutasOrdenadas, paginaActual]
  );

  const cambiarBusqueda = (v: string) => { setBusqueda(v); setPaginaActual(1); };
  const cambiarSoloActivas = (v: boolean) => { setSoloActivas(v); setPaginaActual(1); };

  const [modalAbierto, setModalAbierto] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [areaId, setAreaId] = useState("");
  // El nombre se guarda como un solo texto ("DESDE-PARADA1-...-HASTA", sin
  // espacios alrededor de los guiones) pero se captura en campos separados
  // para que sea consistente entre rutas — ver guardar() más abajo. Las
  // paradas son opcionales y arrancan ocultas: la mayoría de las rutas son
  // solo Desde/Hasta, y así se evita que alguien termine escribiendo varias
  // paradas juntas a mano dentro de "Hasta" (ej. "TABACUNDO-SAN PABLO").
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [paradas, setParadas] = useState<string[]>([]);
  const [valor, setValor] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  const [idGestionar, setIdGestionar] = useState<string | null>(null);
  const [procesando, setProcesando] = useState(false);
  const [errorGestion, setErrorGestion] = useState("");
  const [confirmandoEliminar, setConfirmandoEliminar] = useState(false);

  // Qué filas tienen la lista de "Exclusiva de N colaboradores" abierta —
  // colapsada por defecto, se expande por fila con un clic.
  const [exclusivasAbiertas, setExclusivasAbiertas] = useState<Set<string>>(new Set());
  const alternarExclusivas = (id: string) => {
    setExclusivasAbiertas((prev) => {
      const copia = new Set(prev);
      if (copia.has(id)) copia.delete(id);
      else copia.add(id);
      return copia;
    });
  };

  // ---------- Eliminar en bloque (solo Super Admin) ----------
  const [seleccionadas, setSeleccionadas] = useState<Set<string>>(new Set());
  const [confirmandoLote, setConfirmandoLote] = useState(false);
  const [eliminandoLote, setEliminandoLote] = useState(false);
  const [errorLote, setErrorLote] = useState("");

  const todasEnPaginaSeleccionadas =
    rutasPagina.length > 0 && rutasPagina.every((r) => seleccionadas.has(r.id));

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
      if (todasEnPaginaSeleccionadas) rutasPagina.forEach((r) => copia.delete(r.id));
      else rutasPagina.forEach((r) => copia.add(r.id));
      return copia;
    });
  };

  const eliminarLote = async () => {
    setEliminandoLote(true);
    setErrorLote("");
    try {
      const res = await fetch("/api/th/rutas/eliminar-lote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(seleccionadas) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorLote(data.error ?? "No se pudo eliminar");
        toast.error(data.error ?? "No se pudieron eliminar las rutas");
        return;
      }
      setConfirmandoLote(false);
      setSeleccionadas(new Set());
      const idsEliminados: string[] = Array.isArray(data.idsEliminados) ? data.idsEliminados : [];
      setIdsOcultos((prev) => new Set([...prev, ...idsEliminados]));
      toast.exito(
        data.omitidas > 0
          ? `${data.eliminadas} ruta(s) eliminada(s); ${data.omitidas} se omitieron por tener solicitudes registradas`
          : `${data.eliminadas} ruta(s) eliminada(s)`
      );
      await cargarDatos();
    } catch {
      setErrorLote("No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.");
      toast.error("No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setEliminandoLote(false);
    }
  };

  const abrirCrear = () => {
    setEditandoId(null);
    setAreaId("");
    setDesde("");
    setHasta("");
    setParadas([]);
    setValor("");
    setError("");
    setModalAbierto(true);
  };

  // Llegar desde "+ Nueva ruta" en Asignar rutas trae ?nueva=1 — abre el
  // modal de creación de una, sin tener que buscar el botón acá.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (new URLSearchParams(window.location.search).get("nueva") !== "1") return;
    (async () => {
      abrirCrear();
    })();
  }, []);

  const abrirEditar = (r: Ruta) => {
    setEditandoId(r.id);
    // El nombre guardado es "DESDE-PARADA1-...-HASTA": el primer segmento es
    // Desde, el último es Hasta, y lo que quede en el medio son las paradas.
    const segmentos = r.nombre.split("-");
    setDesde(segmentos[0] ?? "");
    setHasta(segmentos.length > 1 ? segmentos[segmentos.length - 1] : "");
    setParadas(segmentos.length > 2 ? segmentos.slice(1, -1) : []);
    setValor(String(r.valor));
    setError("");
    setModalAbierto(true);
  };

  const agregarParada = () => setParadas((prev) => [...prev, ""]);
  const cambiarParada = (idx: number, valor: string) =>
    setParadas((prev) => prev.map((p, i) => (i === idx ? valor : p)));
  const quitarParada = (idx: number) => setParadas((prev) => prev.filter((_, i) => i !== idx));

  const guardar = async () => {
    const numero = Number(valor);
    const paradasLimpias = paradas.map((p) => p.trim()).filter(Boolean);
    if (!desde.trim() || !hasta.trim() || !valor || isNaN(numero) || numero <= 0) {
      setError("Desde, Hasta y valor (mayor a 0) son obligatorios");
      return;
    }
    if (paradas.some((p) => !p.trim())) {
      setError("Completa el nombre de cada parada, o quítala si no hace falta");
      return;
    }
    if (!editandoId && !areaId) {
      setError("Selecciona un área");
      return;
    }

    setGuardando(true);
    setError("");

    const nombre = [desde.trim(), ...paradasLimpias, hasta.trim()].join("-");
    const url = editandoId ? `/api/th/rutas/${editandoId}` : "/api/th/rutas";
    const method = editandoId ? "PATCH" : "POST";
    const body = editandoId ? { nombre, valor: numero } : { areaId, nombre, valor: numero };

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "No se pudo guardar");
        toast.error(data.error ?? "No se pudo guardar la ruta");
        return;
      }
      setModalAbierto(false);
      toast.exito(editandoId ? "Ruta actualizada" : "Ruta creada");
      await cargarDatos();
    } catch {
      setError("No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.");
      toast.error("No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setGuardando(false);
    }
  };

  const rutaGestionar = rutas.find((r) => r.id === idGestionar);

  const cambiarEstado = async (nuevoActivo: boolean) => {
    if (!idGestionar) return;
    setProcesando(true);
    setErrorGestion("");
    try {
      const res = await fetch(`/api/th/rutas/${idGestionar}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activo: nuevoActivo }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErrorGestion(data.error ?? "No se pudo actualizar");
        toast.error(data.error ?? "No se pudo actualizar la ruta");
        return;
      }
      setIdGestionar(null);
      toast.exito(nuevoActivo ? "Ruta reactivada" : "Ruta desactivada");
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
      const res = await fetch(`/api/th/rutas/${idGestionar}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErrorGestion(data.error ?? "No se pudo eliminar");
        toast.error(data.error ?? "No se pudo eliminar la ruta");
        return;
      }
      setIdsOcultos((prev) => new Set(prev).add(idGestionar));
      setIdGestionar(null);
      setConfirmandoEliminar(false);
      toast.exito("Ruta eliminada");
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
      <div className="flex items-center justify-end gap-2">
        <div className="flex items-center gap-2">
          {esSuperAdmin && seleccionadas.size > 0 && (
            <button
              onClick={() => { setConfirmandoLote(true); setErrorLote(""); }}
              className="text-xs sm:text-sm font-semibold bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-lg transition shadow-sm hover:shadow-md"
            >
              Eliminar seleccionadas ({seleccionadas.size})
            </button>
          )}
          <button
            onClick={abrirCrear}
            disabled={sinAsignaciones}
            className="text-xs sm:text-sm font-semibold bg-orange-500 hover:bg-orange-600 text-black px-3 py-2 rounded-lg transition shadow-sm hover:shadow-md hover:-translate-y-0.5 disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:shadow-sm"
          >
            + Nueva ruta
          </button>
        </div>
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
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <IconoLupa className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 dark:text-neutral-500 pointer-events-none" />
            <input
              value={busqueda}
              onChange={(e) => cambiarBusqueda(e.target.value)}
              placeholder="Buscar por nombre o área..."
              className="w-full rounded-xl border border-neutral-300 bg-white text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white pl-10 pr-4 py-2.5 text-sm placeholder-neutral-500 focus:border-orange-400 focus:ring-2 focus:ring-orange-500/15 outline-none"
            />
          </div>
          <div className="flex items-center gap-2 bg-white border border-neutral-200 dark:bg-neutral-900 dark:border-neutral-800 rounded-xl px-3.5 py-2.5">
            <ToggleSwitch checked={soloActivas} onChange={cambiarSoloActivas} label="Solo activas" />
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
                {esSuperAdmin && (
                  <th className="px-4 py-3 w-8">
                    <input
                      type="checkbox"
                      checked={todasEnPaginaSeleccionadas}
                      onChange={alternarSeleccionarTodo}
                      className="w-4 h-4 accent-orange-500 rounded"
                    />
                  </th>
                )}
                <EncabezadoOrdenable campo="numero" ordenActivo={orden} onOrdenar={ordenar} className="w-12">N°</EncabezadoOrdenable>
                <EncabezadoOrdenable campo="nombre" ordenActivo={orden} onOrdenar={ordenar}>Ruta</EncabezadoOrdenable>
                <EncabezadoOrdenable campo="valor" ordenActivo={orden} onOrdenar={ordenar}>Valor</EncabezadoOrdenable>
                <EncabezadoOrdenable campo="activo" ordenActivo={orden} onOrdenar={ordenar}>Estado</EncabezadoOrdenable>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {rutasPagina.map((r) => (
                <tr key={r.id} className="border-t border-neutral-200/70 dark:border-neutral-800/70 hover:bg-neutral-100/60 dark:hover:bg-neutral-800/60 transition">
                  {esSuperAdmin && (
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={seleccionadas.has(r.id)}
                        onChange={() => alternarSeleccion(r.id)}
                        className="w-4 h-4 accent-orange-500 rounded"
                      />
                    </td>
                  )}
                  <td className="px-4 py-3 text-neutral-400 dark:text-neutral-500">{r.numero}</td>
                  <td className="px-4 py-3 text-neutral-600">
                    {r.nombre}
                    {r.colaboradoresExclusivosNombres.length > 0 && (
                      <div className="mt-0.5">
                        <button
                          type="button"
                          onClick={() => alternarExclusivas(r.id)}
                          className="inline-flex items-center gap-1 text-[10px] font-semibold text-orange-600 hover:text-orange-700 transition"
                        >
                          <IconoChevron
                            className={`w-2.5 h-2.5 transition-transform ${exclusivasAbiertas.has(r.id) ? "rotate-90" : ""}`}
                          />
                          Exclusiva de {r.colaboradoresExclusivosNombres.length} colaborador{r.colaboradoresExclusivosNombres.length === 1 ? "" : "es"}
                        </button>
                        {exclusivasAbiertas.has(r.id) && (
                          <div className="mt-1 rounded-lg ring-1 ring-black/5 dark:ring-white/10 overflow-hidden max-w-[220px]">
                            {r.colaboradoresExclusivosNombres.map((nombre) => (
                              <p
                                key={nombre}
                                className="px-2 py-1 text-[11px] font-normal text-neutral-600 dark:text-neutral-300 bg-neutral-50 dark:bg-neutral-800/60 border-t border-neutral-200/70 dark:border-neutral-700/70 first:border-t-0 truncate"
                              >
                                {nombre}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">{formatearMoneda(r.valor)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${
                        r.activo ? "bg-green-100 text-green-800" : "bg-neutral-200 text-neutral-600"
                      }`}
                    >
                      {r.activo ? "Activa" : "Inactiva"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <MenuAcciones
                      acciones={[
                        { label: "Editar", onClick: () => abrirEditar(r) },
                        {
                          label: "Gestionar",
                          tono: "peligro",
                          onClick: () => { setIdGestionar(r.id); setErrorGestion(""); setConfirmandoEliminar(false); },
                        },
                      ]}
                    />
                  </td>
                </tr>
              ))}
              {rutasFiltradas.length === 0 && (
                <tr>
                  <td colSpan={esSuperAdmin ? 6 : 5} className="px-4 py-10">
                    <EstadoVacio
                      mensaje={
                        busqueda || empresaFiltro || sitioFiltro || areaFiltro
                          ? "Sin resultados para esos filtros"
                          : soloActivas
                          ? "No hay rutas activas"
                          : "Aún no hay rutas creadas"
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
        abierto={modalAbierto}
        onCerrar={() => setModalAbierto(false)}
        onConfirmar={guardar}
        className="bg-white dark:bg-neutral-900 text-black dark:text-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-sm p-7 space-y-4 shadow-2xl"
      >
            <h2 className="text-lg font-bold text-neutral-900 dark:text-white">{editandoId ? "Editar ruta" : "Nueva ruta"}</h2>

            {!editandoId && (
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
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                  Desde
                </label>
                <input
                  value={desde}
                  onChange={(e) => setDesde(e.target.value.toUpperCase())}
                  className="mt-1.5 w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white px-3.5 py-3 text-sm focus:border-orange-400 focus:ring-2 focus:ring-orange-500/15 outline-none"
                  placeholder="Ej: CAYAMBE"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                  Hasta
                </label>
                <input
                  value={hasta}
                  onChange={(e) => setHasta(e.target.value.toUpperCase())}
                  className="mt-1.5 w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white px-3.5 py-3 text-sm focus:border-orange-400 focus:ring-2 focus:ring-orange-500/15 outline-none"
                  placeholder="Ej: TABACUNDO"
                />
              </div>
            </div>

            {paradas.length > 0 && (
              <div className="space-y-2">
                {paradas.map((parada, idx) => (
                  <div key={idx}>
                    <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                      Parada {idx + 1}
                    </label>
                    <div className="mt-1.5 flex gap-2">
                      <input
                        value={parada}
                        onChange={(e) => cambiarParada(idx, e.target.value.toUpperCase())}
                        className="flex-1 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white px-3.5 py-3 text-sm focus:border-orange-400 focus:ring-2 focus:ring-orange-500/15 outline-none"
                        placeholder="Ej: TABACUNDO"
                      />
                      <button
                        type="button"
                        onClick={() => quitarParada(idx)}
                        title="Quitar parada"
                        className="shrink-0 px-3 rounded-xl text-neutral-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={agregarParada}
              className="text-xs font-semibold text-orange-600 hover:text-orange-700 self-start"
            >
              + Agregar parada
            </button>

            {desde.trim() && hasta.trim() && (
              <p className="text-xs text-neutral-400 dark:text-neutral-500">
                Se guarda como:{" "}
                <span className="font-semibold text-neutral-600 dark:text-neutral-300">
                  {[desde.trim(), ...paradas.map((p) => p.trim()).filter(Boolean), hasta.trim()].join("-")}
                </span>
              </p>
            )}

            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Valor</label>
              <div className="mt-1.5 relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-neutral-500 text-sm">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                  className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white pl-7 pr-3.5 py-3 text-sm focus:border-orange-400 focus:ring-2 focus:ring-orange-500/15 outline-none"
                  placeholder="0.90"
                />
              </div>
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

      <Modal abierto={!!idGestionar && !confirmandoEliminar} onCerrar={() => setIdGestionar(null)} variante="centro" className="bg-white dark:bg-neutral-900 text-black dark:text-white rounded-3xl p-7 w-full max-w-sm space-y-4 shadow-2xl">
            <div>
              <h2 className="font-semibold text-neutral-900 dark:text-white">{rutaGestionar?.nombre}</h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">Elige qué hacer con esta ruta</p>
            </div>

            {errorGestion && <p className="text-sm text-red-600">{errorGestion}</p>}

            <div className="space-y-2">
              {rutaGestionar?.activo ? (
                <button
                  onClick={() => cambiarEstado(false)}
                  disabled={procesando}
                  className="w-full text-left px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition disabled:opacity-50"
                >
                  <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">Desactivar</p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">Deja de estar disponible para nuevas solicitudes. Se puede reactivar luego.</p>
                </button>
              ) : (
                <button
                  onClick={() => cambiarEstado(true)}
                  disabled={procesando}
                  className="w-full text-left px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition disabled:opacity-50"
                >
                  <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">Reactivar</p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">Vuelve a estar disponible para nuevas solicitudes.</p>
                </button>
              )}

              <button
                onClick={() => setConfirmandoEliminar(true)}
                disabled={procesando || rutaGestionar?.tieneSolicitudes}
                className="w-full text-left px-4 py-3 rounded-xl border border-red-200 hover:bg-red-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <p className="text-sm font-medium text-red-600">Eliminar definitivamente</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  {rutaGestionar?.tieneSolicitudes
                    ? "No disponible: tiene solicitudes registradas en su historial."
                    : "La borra por completo. No se puede deshacer."}
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
            <p className="font-semibold text-neutral-900 dark:text-white">¿Eliminar &quot;{rutaGestionar?.nombre}&quot;?</p>
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

      <Modal abierto={confirmandoLote} onCerrar={() => setConfirmandoLote(false)} onConfirmar={eliminarLote} variante="centro" className="bg-white dark:bg-neutral-900 text-black dark:text-white rounded-3xl p-7 w-full max-w-xs text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto"><IconoAlerta className="w-6 h-6" /></div>
            <p className="font-semibold text-neutral-900 dark:text-white">¿Eliminar {seleccionadas.size} ruta(s)?</p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Esta acción no se puede deshacer. Las que tengan solicitudes registradas se omiten automáticamente.
            </p>
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
                className="flex-1 px-4 py-2.5 text-sm font-semibold bg-red-500 hover:bg-red-600 text-white rounded-xl disabled:opacity-50 transition"
              >
                {eliminandoLote ? "Eliminando..." : "Sí, eliminar"}
              </button>
            </div>
      </Modal>
    </div>
  );
}