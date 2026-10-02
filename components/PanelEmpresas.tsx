// components/PanelEmpresas.tsx
// Gestión de Empresas -> Sitios -> Áreas, en cascada. Cada elemento tiene
// "Editar" (renombrar) y "Gestionar" (Desactivar/Reactivar solo en Empresa,
// y Eliminar en los 3 niveles), igual que en Colaboradores y Rutas.
// Con buscador general (empresas, sitios y áreas a la vez, resultados en la
// misma página) y un filtro por columna; cada columna scrollea por dentro
// para que la página no crezca con cientos de sitios/áreas.

"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Modal from "./Modal";
import ModalGestionar from "./ModalGestionar";
import ModalConfirmar from "./ModalConfirmar";
import MenuAcciones from "./MenuAcciones";
import { IconoAlerta, IconoLupa, IconoX, IconoChevron } from "./Icons";
import Spinner from "./Spinner";
import { useReportarCarga } from "../lib/cargaGlobal";
import { useToast } from "./Toast";

type Area = { id: string; nombre: string; whatsapp: string | null };
type Sitio = { id: string; nombre: string; direccion: string | null; whatsapp: string | null; areas: Area[] };
type Empresa = {
  id: string;
  numero: number;
  nombre: string;
  ruc: string | null;
  whatsapp: string | null;
  activo: boolean;
  sitios: Sitio[];
};

type ElementoGestion = {
  tipo: "empresa" | "sitio" | "area";
  id: string;
  nombre: string;
  activo?: boolean; // solo aplica a "empresa"
  tieneHijos: boolean; // true = tiene sitios/áreas dependientes, bloquea Eliminar
};

const URLS: Record<ElementoGestion["tipo"], string> = {
  empresa: "/api/admin/empresas",
  sitio: "/api/admin/sitios",
  area: "/api/admin/areas",
};

const ETIQUETA_HIJOS: Record<ElementoGestion["tipo"], string> = {
  empresa: "Sitios",
  sitio: "Áreas",
  area: "colaboradores, rutas o asignaciones de TH",
};

// Sin mayúsculas ni tildes: "logistica" encuentra "LOGÍSTICA".
const normalizar = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const MAX_RESULTADOS = 50;

type ResultadoBusqueda = {
  tipo: "empresa" | "sitio" | "area";
  id: string;
  nombre: string;
  ruta: string;
  empresaId: string;
  sitioId: string | null;
};

const ETIQUETA_TIPO: Record<ResultadoBusqueda["tipo"], string> = { empresa: "Empresa", sitio: "Sitio", area: "Área" };
const CLASE_TIPO: Record<ResultadoBusqueda["tipo"], string> = {
  empresa: "bg-orange-100 text-orange-800 dark:bg-orange-500/15 dark:text-orange-300",
  sitio: "bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300",
  area: "bg-neutral-200 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-200",
};

type AccionFila = { label: string; onClick: () => void; tono?: "normal" | "peligro" };

// Una columna del árbol: título con total y "+ Nueva", filtro propio y la
// lista con scroll interno. La fila elegida se lleva a la vista sola (al
// elegir desde el buscador puede quedar muy abajo).
function Columna<T extends { id: string; nombre: string }>({
  titulo,
  textoNuevo,
  onNuevo,
  nuevoDeshabilitado,
  items,
  seleccionadoId,
  onElegir,
  detalle,
  inactivo,
  acciones,
  vacio,
  filtro,
  onFiltro,
  columnaRef,
}: {
  titulo: string;
  textoNuevo: string;
  onNuevo: () => void;
  nuevoDeshabilitado?: boolean;
  items: T[] | null;
  seleccionadoId: string | null;
  onElegir?: (item: T) => void;
  detalle?: (item: T) => string;
  inactivo?: (item: T) => boolean;
  acciones: (item: T) => AccionFila[];
  vacio: string;
  filtro: string;
  onFiltro: (v: string) => void;
  columnaRef?: React.Ref<HTMLDivElement>;
}) {
  const listaRef = useRef<HTMLDivElement>(null);
  const visibles = useMemo(() => {
    if (!items) return null;
    const texto = normalizar(filtro.trim());
    return texto ? items.filter((i) => normalizar(i.nombre).includes(texto)) : items;
  }, [items, filtro]);

  useEffect(() => {
    if (!seleccionadoId) return;
    listaRef.current?.querySelector(`[data-id="${seleccionadoId}"]`)?.scrollIntoView({ block: "nearest" });
  }, [seleccionadoId]);

  return (
    <div
      ref={columnaRef}
      className="bg-neutral-50 dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 rounded-2xl shadow-sm ring-1 ring-black/5 dark:ring-white/10 flex flex-col scroll-mt-20"
    >
      <div className="p-3 space-y-2 border-b border-neutral-200/70 dark:border-neutral-800/70">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-semibold text-sm">
            {titulo}
            {items && <span className="ml-1.5 text-xs font-medium text-neutral-400 dark:text-neutral-500">({items.length})</span>}
          </h2>
          <button
            onClick={onNuevo}
            disabled={nuevoDeshabilitado}
            className="text-xs font-semibold bg-orange-500 hover:bg-orange-600 text-black px-2.5 py-1.5 rounded-lg transition shadow-sm disabled:opacity-40"
          >
            {textoNuevo}
          </button>
        </div>
        {items && items.length > 0 && (
          <div className="relative">
            <IconoLupa className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400 pointer-events-none" />
            <input
              value={filtro}
              onChange={(e) => onFiltro(e.target.value)}
              placeholder={`Filtrar ${titulo.toLowerCase()}...`}
              aria-label={`Filtrar ${titulo.toLowerCase()}`}
              className="w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white pl-8 pr-7 py-1.5 text-xs placeholder-neutral-400 focus:border-orange-400 focus:ring-2 focus:ring-orange-500/15 outline-none"
            />
            {filtro && (
              <button
                onClick={() => onFiltro("")}
                aria-label="Quitar filtro"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
              >
                <IconoX className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      <div ref={listaRef} className="p-2 space-y-1 overflow-y-auto max-h-[55vh] md:h-[55vh]">
        {visibles?.map((item) => {
          const elegido = item.id === seleccionadoId;
          const texto = detalle?.(item);
          return (
            <div
              key={item.id}
              data-id={item.id}
              onClick={onElegir ? () => onElegir(item) : undefined}
              className={`flex items-center gap-2 pl-3 pr-1 py-2 rounded-lg transition ${onElegir ? "cursor-pointer" : ""} ${
                elegido
                  ? "bg-orange-50 dark:bg-orange-500/10 text-orange-800 dark:text-orange-300 ring-1 ring-orange-200 dark:ring-orange-500/20"
                  : "hover:bg-white dark:hover:bg-neutral-800"
              }`}
            >
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate" title={item.nombre}>{item.nombre}</p>
                {texto && (
                  <p className={`text-[11px] ${elegido ? "text-orange-700/70 dark:text-orange-300/70" : "text-neutral-400 dark:text-neutral-500"}`}>{texto}</p>
                )}
              </div>
              {inactivo?.(item) && (
                <span className="text-[10px] font-semibold bg-neutral-200 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300 px-1.5 py-0.5 rounded shrink-0">
                  INACTIVA
                </span>
              )}
              <div onClick={(ev) => ev.stopPropagation()} className="shrink-0">
                <MenuAcciones acciones={acciones(item)} />
              </div>
              {onElegir && <IconoChevron className={`w-3.5 h-3.5 shrink-0 ${elegido ? "" : "text-neutral-300 dark:text-neutral-600"}`} />}
            </div>
          );
        })}
        {visibles && visibles.length === 0 && (
          <p className="text-xs text-neutral-400 dark:text-neutral-500 px-2 py-3">
            {items && items.length > 0 ? "Nada coincide con el filtro" : vacio}
          </p>
        )}
        {!visibles && <p className="text-xs text-neutral-400 dark:text-neutral-500 px-2 py-3">{vacio}</p>}
      </div>
    </div>
  );
}

export default function PanelEmpresas() {
  const toast = useToast();

  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [cargandoInicial, setCargandoInicial] = useState(true);
  const [errorInicial, setErrorInicial] = useState("");
  useReportarCarga(cargandoInicial);
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [sitioId, setSitioId] = useState<string | null>(null);

  const cargarDatos = async () => {
    try {
      const res = await fetch("/api/admin/empresas/datos");
      if (!res.ok) {
        setErrorInicial("No se pudo cargar la información. Intenta de nuevo.");
        return;
      }
      const data: Empresa[] = await res.json();
      setEmpresas(data);
      setEmpresaId((actual) => (actual && data.some((e) => e.id === actual) ? actual : (data[0]?.id ?? null)));
      setErrorInicial("");
    } catch {
      setErrorInicial("No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.");
    }
  };

  useEffect(() => {
    let cancelado = false;
    fetch("/api/admin/empresas/datos")
      .then(async (res) => {
        if (cancelado) return;
        if (!res.ok) {
          setErrorInicial("No se pudo cargar la información. Intenta de nuevo.");
          return;
        }
        const data: Empresa[] = await res.json();
        setEmpresas(data);
        setEmpresaId(data[0]?.id ?? null);
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

  const empresaSeleccionada = empresas.find((e) => e.id === empresaId) ?? null;
  const sitioSeleccionado = empresaSeleccionada?.sitios.find((s) => s.id === sitioId) ?? null;

  const [areaId, setAreaId] = useState<string | null>(null);
  const [filtroEmpresas, setFiltroEmpresas] = useState("");
  const [filtroSitios, setFiltroSitios] = useState("");
  const [filtroAreas, setFiltroAreas] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const columnaSitiosRef = useRef<HTMLDivElement>(null);
  const columnaAreasRef = useRef<HTMLDivElement>(null);

  // En celular las columnas van una debajo de otra: al elegir, se baja
  // sola hasta la siguiente para no tener que buscarla.
  const bajarA = (ref: React.RefObject<HTMLDivElement | null>) => {
    if (window.matchMedia("(max-width: 767px)").matches) {
      requestAnimationFrame(() => ref.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    }
  };

  const elegirEmpresa = (id: string) => {
    setEmpresaId(id);
    setSitioId(null);
    setAreaId(null);
    setFiltroSitios("");
    setFiltroAreas("");
    bajarA(columnaSitiosRef);
  };

  const elegirSitio = (id: string) => {
    setSitioId(id);
    setAreaId(null);
    setFiltroAreas("");
    bajarA(columnaAreasRef);
  };

  // Índice plano de los 3 niveles para el buscador general.
  const indice = useMemo(() => {
    const lista: (ResultadoBusqueda & { clave: string })[] = [];
    for (const e of empresas) {
      lista.push({ tipo: "empresa", id: e.id, nombre: e.nombre, ruta: `Empresa N° ${e.numero}`, empresaId: e.id, sitioId: null, clave: normalizar(e.nombre) });
      for (const s of e.sitios) {
        lista.push({ tipo: "sitio", id: s.id, nombre: s.nombre, ruta: e.nombre, empresaId: e.id, sitioId: null, clave: normalizar(s.nombre) });
        for (const a of s.areas) {
          lista.push({ tipo: "area", id: a.id, nombre: a.nombre, ruta: `${e.nombre} › ${s.nombre}`, empresaId: e.id, sitioId: s.id, clave: normalizar(a.nombre) });
        }
      }
    }
    return lista;
  }, [empresas]);

  const resultados = useMemo(() => {
    const texto = normalizar(busqueda.trim());
    return texto ? indice.filter((r) => r.clave.includes(texto)) : [];
  }, [indice, busqueda]);

  const irAResultado = (r: ResultadoBusqueda) => {
    setFiltroEmpresas("");
    setFiltroSitios("");
    setFiltroAreas("");
    setEmpresaId(r.empresaId);
    if (r.tipo === "empresa") { setSitioId(null); setAreaId(null); }
    if (r.tipo === "sitio") { setSitioId(r.id); setAreaId(null); }
    if (r.tipo === "area") { setSitioId(r.sitioId); setAreaId(r.id); }
    setBusqueda("");
    bajarA(r.tipo === "empresa" ? columnaSitiosRef : columnaAreasRef);
  };

  // ---------- Modal Crear/Editar ----------
  const [modal, setModal] = useState<null | { tipo: "empresa" | "sitio" | "area"; id: string | null }>(null);
  const [nombre, setNombre] = useState("");
  const [extra, setExtra] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  const abrirCrearEmpresa = () => { setModal({ tipo: "empresa", id: null }); setNombre(""); setExtra(""); setWhatsapp(""); setError(""); };
  const abrirEditarEmpresa = (e: Empresa) => { setModal({ tipo: "empresa", id: e.id }); setNombre(e.nombre); setExtra(e.ruc ?? ""); setWhatsapp(e.whatsapp ?? ""); setError(""); };
  const abrirCrearSitio = () => { setModal({ tipo: "sitio", id: null }); setNombre(""); setExtra(""); setWhatsapp(""); setError(""); };
  const abrirEditarSitio = (s: Sitio) => { setModal({ tipo: "sitio", id: s.id }); setNombre(s.nombre); setExtra(s.direccion ?? ""); setWhatsapp(s.whatsapp ?? ""); setError(""); };
  const abrirCrearArea = () => { setModal({ tipo: "area", id: null }); setNombre(""); setWhatsapp(""); setError(""); };
  const abrirEditarArea = (a: Area) => { setModal({ tipo: "area", id: a.id }); setNombre(a.nombre); setWhatsapp(a.whatsapp ?? ""); setError(""); };

  const guardar = async () => {
    if (!nombre.trim()) {
      setError("El nombre es obligatorio");
      return;
    }
    setGuardando(true);
    setError("");

    let url = "";
    let body: Record<string, unknown> = {};

    if (modal!.tipo === "empresa") {
      url = modal!.id ? `/api/admin/empresas/${modal!.id}` : "/api/admin/empresas";
      body = { nombre, ruc: extra, whatsapp };
    } else if (modal!.tipo === "sitio") {
      url = modal!.id ? `/api/admin/sitios/${modal!.id}` : "/api/admin/sitios";
      body = modal!.id ? { nombre, direccion: extra, whatsapp } : { empresaId, nombre, direccion: extra, whatsapp };
    } else {
      url = modal!.id ? `/api/admin/areas/${modal!.id}` : "/api/admin/areas";
      body = modal!.id ? { nombre, whatsapp } : { sitioId, nombre, whatsapp };
    }

    try {
      const res = await fetch(url, {
        method: modal!.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "No se pudo guardar");
        toast.error(data.error ?? "No se pudo guardar");
        return;
      }
      const ETIQUETAS: Record<string, string> = { empresa: "Empresa", sitio: "Sitio", area: "Área" };
      const TERMINACION: Record<string, string> = { empresa: "a", sitio: "o", area: "a" };
      toast.exito(`${ETIQUETAS[modal!.tipo]} ${modal!.id ? "actualizad" : "cread"}${TERMINACION[modal!.tipo]}`);
      setModal(null);
      await cargarDatos();
    } catch {
      setError("No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.");
      toast.error("No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setGuardando(false);
    }
  };

  // ---------- Modal Gestionar (Desactivar/Reactivar + Eliminar) ----------
  const [gestionando, setGestionando] = useState<ElementoGestion | null>(null);
  const [procesando, setProcesando] = useState(false);
  const [errorGestion, setErrorGestion] = useState("");
  const [confirmandoEliminar, setConfirmandoEliminar] = useState(false);

  const cambiarEstadoEmpresa = async (nuevoActivo: boolean) => {
    if (!gestionando) return;
    setProcesando(true);
    setErrorGestion("");
    try {
      const res = await fetch(`/api/admin/empresas/${gestionando.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activo: nuevoActivo }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErrorGestion(data.error ?? "No se pudo actualizar");
        toast.error(data.error ?? "No se pudo actualizar la empresa");
        return;
      }
      toast.exito(nuevoActivo ? "Empresa reactivada" : "Empresa desactivada");
      setGestionando(null);
      await cargarDatos();
    } catch {
      setErrorGestion("No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.");
      toast.error("No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setProcesando(false);
    }
  };

  const eliminar = async () => {
    if (!gestionando) return;
    setProcesando(true);
    setErrorGestion("");
    try {
      const res = await fetch(`${URLS[gestionando.tipo]}/${gestionando.id}`, { method: "DELETE" });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErrorGestion(data.error ?? "No se pudo eliminar");
        toast.error(data.error ?? "No se pudo eliminar");
        return;
      }

      if (gestionando.tipo === "empresa" && gestionando.id === empresaId) { setEmpresaId(null); setSitioId(null); }
      if (gestionando.tipo === "sitio" && gestionando.id === sitioId) setSitioId(null);
      if (gestionando.tipo === "area" && gestionando.id === areaId) setAreaId(null);

      const ETIQUETAS: Record<string, string> = { empresa: "Empresa", sitio: "Sitio", area: "Área" };
      toast.exito(`${ETIQUETAS[gestionando.tipo]} eliminada`);
      setGestionando(null);
      setConfirmandoEliminar(false);
      await cargarDatos();
    } catch {
      setErrorGestion("No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.");
      toast.error("No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setProcesando(false);
    }
  };

  const gestionar = (g: ElementoGestion) => {
    setGestionando(g);
    setErrorGestion("");
    setConfirmandoEliminar(false);
  };

  return (
    <div className="flex-1 px-4 sm:px-8 pb-5 space-y-4">
      {errorInicial && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{errorInicial}</div>
      )}

      {!cargandoInicial && (
      <>
      {/* Buscador general: resultados en la misma página, no en un desplegable */}
      <div className="bg-neutral-50 dark:bg-neutral-900 rounded-2xl shadow-sm ring-1 ring-black/5 dark:ring-white/10">
        <div className="relative">
          <IconoLupa className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && resultados[0]) irAResultado(resultados[0]);
              if (e.key === "Escape") setBusqueda("");
            }}
            placeholder="Buscar empresa, sitio o área..."
            aria-label="Buscar empresa, sitio o área"
            className="w-full bg-transparent text-neutral-900 dark:text-white pl-11 pr-10 py-3 text-sm placeholder-neutral-500 outline-none rounded-2xl focus:ring-2 focus:ring-orange-500/20"
          />
          {busqueda && (
            <button
              onClick={() => setBusqueda("")}
              aria-label="Limpiar búsqueda"
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 dark:hover:text-neutral-200 dark:hover:bg-neutral-800"
            >
              <IconoX className="w-4 h-4" />
            </button>
          )}
        </div>
        {busqueda.trim() && (
          <div className="border-t border-neutral-200/70 dark:border-neutral-800/70 p-2">
            <p className="px-2 pb-1.5 text-[11px] text-neutral-400 dark:text-neutral-500">
              {resultados.length === 0
                ? "Sin resultados"
                : `${resultados.length} resultado${resultados.length === 1 ? "" : "s"}${
                    resultados.length > MAX_RESULTADOS ? ` · se muestran los primeros ${MAX_RESULTADOS}, escribe más para acotar` : ""
                  }`}
            </p>
            <div className="max-h-72 overflow-y-auto space-y-0.5">
              {resultados.slice(0, MAX_RESULTADOS).map((r) => (
                <button
                  key={`${r.tipo}-${r.id}`}
                  onClick={() => irAResultado(r)}
                  className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-left hover:bg-white dark:hover:bg-neutral-800 transition"
                >
                  <span className={`text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded shrink-0 w-16 text-center ${CLASE_TIPO[r.tipo]}`}>
                    {ETIQUETA_TIPO[r.tipo]}
                  </span>
                  <span className="text-xs font-medium text-neutral-900 dark:text-white truncate">{r.nombre}</span>
                  <span className="text-[11px] text-neutral-400 dark:text-neutral-500 truncate ml-auto">{r.ruta}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Dónde estás */}
      {empresaSeleccionada && (
        <nav aria-label="Selección actual" className="flex flex-wrap items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400 px-1">
          <button onClick={() => elegirEmpresa(empresaSeleccionada.id)} className="font-semibold text-neutral-800 dark:text-neutral-200 hover:text-orange-600">
            {empresaSeleccionada.nombre}
          </button>
          {sitioSeleccionado && (
            <>
              <IconoChevron className="w-3 h-3" />
              <button onClick={() => elegirSitio(sitioSeleccionado.id)} className="font-semibold text-neutral-800 dark:text-neutral-200 hover:text-orange-600">
                {sitioSeleccionado.nombre}
              </button>
            </>
          )}
          {sitioSeleccionado && areaId && (
            <>
              <IconoChevron className="w-3 h-3" />
              <span className="font-semibold text-orange-700 dark:text-orange-400">
                {sitioSeleccionado.areas.find((a) => a.id === areaId)?.nombre}
              </span>
            </>
          )}
        </nav>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
        <Columna
          titulo="Empresas"
          textoNuevo="+ Nueva"
          onNuevo={abrirCrearEmpresa}
          items={empresas}
          seleccionadoId={empresaId}
          onElegir={(e) => elegirEmpresa(e.id)}
          detalle={(e) => `${e.sitios.length} sitio${e.sitios.length === 1 ? "" : "s"}`}
          inactivo={(e) => !e.activo}
          acciones={(e) => [
            { label: "Editar", onClick: () => abrirEditarEmpresa(e) },
            {
              label: "Gestionar",
              tono: "peligro",
              onClick: () => gestionar({ tipo: "empresa", id: e.id, nombre: e.nombre, activo: e.activo, tieneHijos: e.sitios.length > 0 }),
            },
          ]}
          vacio="Aún no hay empresas"
          filtro={filtroEmpresas}
          onFiltro={setFiltroEmpresas}
        />
        <Columna
          titulo="Sitios"
          textoNuevo="+ Nuevo"
          onNuevo={abrirCrearSitio}
          nuevoDeshabilitado={!empresaId}
          items={empresaSeleccionada?.sitios ?? null}
          seleccionadoId={sitioId}
          onElegir={(s) => elegirSitio(s.id)}
          detalle={(s) => `${s.areas.length} área${s.areas.length === 1 ? "" : "s"}`}
          acciones={(s) => [
            { label: "Editar", onClick: () => abrirEditarSitio(s) },
            {
              label: "Gestionar",
              tono: "peligro",
              onClick: () => gestionar({ tipo: "sitio", id: s.id, nombre: s.nombre, tieneHijos: s.areas.length > 0 }),
            },
          ]}
          vacio={empresaSeleccionada ? "Esta empresa no tiene sitios aún" : "Elige una empresa primero"}
          filtro={filtroSitios}
          onFiltro={setFiltroSitios}
          columnaRef={columnaSitiosRef}
        />
        <Columna
          titulo="Áreas"
          textoNuevo="+ Nueva"
          onNuevo={abrirCrearArea}
          nuevoDeshabilitado={!sitioId}
          items={sitioSeleccionado?.areas ?? null}
          seleccionadoId={areaId}
          acciones={(a) => [
            { label: "Editar", onClick: () => abrirEditarArea(a) },
            {
              label: "Gestionar",
              tono: "peligro",
              onClick: () => gestionar({ tipo: "area", id: a.id, nombre: a.nombre, tieneHijos: false }),
            },
          ]}
          vacio={sitioSeleccionado ? "Este sitio no tiene áreas aún" : "Elige un sitio primero"}
          filtro={filtroAreas}
          onFiltro={setFiltroAreas}
          columnaRef={columnaAreasRef}
        />
      </div>
      </>
      )}

      {/* Modal: Crear/Editar */}
      <Modal
        abierto={!!modal}
        onCerrar={() => setModal(null)}
        onConfirmar={guardar}
        className="bg-white dark:bg-neutral-900 text-black dark:text-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-sm p-7 space-y-4 shadow-2xl"
      >
            <h2 className="text-lg font-bold text-neutral-900 dark:text-white">
              {modal?.id ? "Editar" : "Nueva"}{" "}
              {modal?.tipo === "empresa" ? "Empresa" : modal?.tipo === "sitio" ? "Sitio" : "Área"}
            </h2>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Nombre</label>
              <input
                value={nombre}
                onChange={(e) => setNombre(e.target.value.toUpperCase())}
                className="mt-1.5 w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white px-3.5 py-3 text-sm focus:border-orange-400 focus:ring-2 focus:ring-orange-500/15 outline-none"
                autoFocus
              />
            </div>

            {modal?.tipo === "empresa" && (
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">RUC (opcional)</label>
                <input
                  value={extra}
                  onChange={(e) => setExtra(e.target.value.toUpperCase())}
                  className="mt-1.5 w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white px-3.5 py-3 text-sm focus:border-orange-400 focus:ring-2 focus:ring-orange-500/15 outline-none"
                />
              </div>
            )}

            {modal?.tipo === "sitio" && (
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Dirección (opcional)</label>
                <input
                  value={extra}
                  onChange={(e) => setExtra(e.target.value.toUpperCase())}
                  className="mt-1.5 w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white px-3.5 py-3 text-sm focus:border-orange-400 focus:ring-2 focus:ring-orange-500/15 outline-none"
                />
              </div>
            )}

            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                WhatsApp de contacto (opcional)
              </label>
              <input
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="Ej: 593987654321"
                className="mt-1.5 w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white px-3.5 py-3 text-sm focus:border-orange-400 focus:ring-2 focus:ring-orange-500/15 outline-none"
              />
              <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-1">
                Con código de país, sin espacios ni &quot;+&quot;. Si no se carga acá, el botón de contacto del colaborador
                usa el de {modal?.tipo === "area" ? "su Sitio o Empresa" : modal?.tipo === "sitio" ? "su Empresa" : "nadie más"}.
              </p>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex gap-2 justify-end pt-1">
              <button
                onClick={() => setModal(null)}
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

      {/* Modal: Gestionar (Desactivar/Reactivar solo Empresa, + Eliminar en los 3) */}
      <ModalGestionar
        abierto={!!gestionando && !confirmandoEliminar}
        onCerrar={() => setGestionando(null)}
        titulo={gestionando?.nombre}
        subtitulo="Elige qué hacer"
        error={errorGestion}
        procesando={procesando}
        activo={gestionando?.tipo === "empresa" ? (gestionando.activo ?? false) : undefined}
        onCambiarActivo={cambiarEstadoEmpresa}
        ayudaDesactivar="No aparecerá disponible para nuevos sitios/rutas. Se puede reactivar luego."
        ayudaReactivar="Vuelve a estar disponible."
        onEliminar={() => setConfirmandoEliminar(true)}
        ayudaEliminar="La borra por completo. No se puede deshacer."
        motivoNoEliminar={gestionando?.tieneHijos ? `No disponible: tiene ${ETIQUETA_HIJOS[gestionando.tipo]} asociados.` : null}
      />

      <ModalConfirmar
        abierto={confirmandoEliminar}
        onCerrar={() => setConfirmandoEliminar(false)}
        onConfirmar={eliminar}
        procesando={procesando}
        error={errorGestion}
        tono="rojo"
        icono={IconoAlerta}
        titulo={<>¿Eliminar {gestionando?.nombre}?</>}
        textoConfirmar="Sí, eliminar"
        textoProcesando="Eliminando..."
      >
        <p className="text-sm text-neutral-500 dark:text-neutral-400">Esta acción no se puede deshacer.</p>
      </ModalConfirmar>
    </div>
  );
}