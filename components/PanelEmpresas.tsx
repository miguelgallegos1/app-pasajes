// components/PanelEmpresas.tsx
// Gestión de Empresas -> Sitios -> Áreas, en cascada. Cada elemento tiene
// "Editar" (renombrar) y "Gestionar" (Desactivar/Reactivar solo en Empresa,
// y Eliminar en los 3 niveles), igual que en Colaboradores y Rutas.

"use client";

import { useState, useEffect } from "react";
import Modal from "./Modal";
import { IconoAlerta } from "./Icons";
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

  const elegirEmpresa = (id: string) => {
    setEmpresaId(id);
    setSitioId(null);
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

  return (
    <div className="flex-1 px-4 sm:px-8 pb-5 space-y-4">
      {errorInicial && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{errorInicial}</div>
      )}

      {!cargandoInicial && (
      <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Columna 1: Empresas */}
        <div className="bg-neutral-50 dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 rounded-2xl p-4 shadow-sm ring-1 ring-black/5 dark:ring-white/10 space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-sm">Empresas</h2>
            <button
              onClick={abrirCrearEmpresa}
              className="text-xs font-semibold bg-orange-500 hover:bg-orange-600 text-black px-2.5 py-1.5 rounded-lg transition shadow-sm hover:shadow-md hover:-translate-y-0.5"
            >
              + Nueva
            </button>
          </div>
          <div className="space-y-1.5">
            {empresas.map((e) => (
              <div
                key={e.id}
                onClick={() => elegirEmpresa(e.id)}
                className={`px-3 py-2.5 rounded-xl cursor-pointer transition shadow-sm hover:shadow-md hover:-translate-y-0.5 ${
                  e.id === empresaId
                    ? "bg-orange-50 dark:bg-orange-500/10 text-orange-800 dark:text-orange-300"
                    : "bg-white dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium truncate">
                    <span className={e.id === empresaId ? "text-orange-800/60 dark:text-orange-300/60" : "text-neutral-400 dark:text-neutral-500"}>{e.numero}.</span>{" "}
                    {e.nombre}
                  </span>
                  {!e.activo && (
                    <span className="text-[10px] font-semibold bg-neutral-200 text-neutral-600 px-1.5 py-0.5 rounded shrink-0">
                      INACTIVA
                    </span>
                  )}
                </div>
                <div className="flex gap-2 mt-1">
                  <button
                    onClick={(ev) => { ev.stopPropagation(); abrirEditarEmpresa(e); }}
                    className={`text-[11px] font-medium underline ${e.id === empresaId ? "text-orange-800/80 dark:text-orange-300/80" : "text-neutral-500 dark:text-neutral-400"}`}
                  >
                    Editar
                  </button>
                  <button
                    onClick={(ev) => {
                      ev.stopPropagation();
                      setGestionando({ tipo: "empresa", id: e.id, nombre: e.nombre, activo: e.activo, tieneHijos: e.sitios.length > 0 });
                      setErrorGestion("");
                      setConfirmandoEliminar(false);
                    }}
                    className={`text-[11px] font-medium underline ${e.id === empresaId ? "text-orange-800/80 dark:text-orange-300/80" : "text-neutral-500 dark:text-neutral-400"}`}
                  >
                    Gestionar
                  </button>
                </div>
              </div>
            ))}
            {empresas.length === 0 && <p className="text-xs text-neutral-400 dark:text-neutral-500 px-1">Aún no hay empresas</p>}
          </div>
        </div>

        {/* Columna 2: Sitios */}
        <div className="bg-neutral-50 dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 rounded-2xl p-4 shadow-sm ring-1 ring-black/5 dark:ring-white/10 space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-sm">Sitios</h2>
            <button
              onClick={abrirCrearSitio}
              disabled={!empresaId}
              className="text-xs font-semibold bg-orange-500 hover:bg-orange-600 text-black px-2.5 py-1.5 rounded-lg transition shadow-sm hover:shadow-md hover:-translate-y-0.5 disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:shadow-sm"
            >
              + Nuevo
            </button>
          </div>
          <div className="space-y-1.5">
            {(empresaSeleccionada?.sitios ?? []).map((s) => (
              <div
                key={s.id}
                onClick={() => setSitioId(s.id)}
                className={`px-3 py-2.5 rounded-xl cursor-pointer transition shadow-sm hover:shadow-md hover:-translate-y-0.5 ${
                  s.id === sitioId
                    ? "bg-orange-50 dark:bg-orange-500/10 text-orange-800 dark:text-orange-300"
                    : "bg-white dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700"
                }`}
              >
                <span className="text-sm font-medium block truncate">{s.nombre}</span>
                <div className="flex gap-2 mt-1">
                  <button
                    onClick={(ev) => { ev.stopPropagation(); abrirEditarSitio(s); }}
                    className={`text-[11px] font-medium underline ${s.id === sitioId ? "text-orange-800/80 dark:text-orange-300/80" : "text-neutral-500 dark:text-neutral-400"}`}
                  >
                    Editar
                  </button>
                  <button
                    onClick={(ev) => {
                      ev.stopPropagation();
                      setGestionando({ tipo: "sitio", id: s.id, nombre: s.nombre, tieneHijos: s.areas.length > 0 });
                      setErrorGestion("");
                      setConfirmandoEliminar(false);
                    }}
                    className={`text-[11px] font-medium underline ${s.id === sitioId ? "text-orange-800/80 dark:text-orange-300/80" : "text-neutral-500 dark:text-neutral-400"}`}
                  >
                    Gestionar
                  </button>
                </div>
              </div>
            ))}
            {empresaSeleccionada && empresaSeleccionada.sitios.length === 0 && (
              <p className="text-xs text-neutral-400 dark:text-neutral-500 px-1">Esta empresa no tiene sitios aún</p>
            )}
            {!empresaSeleccionada && <p className="text-xs text-neutral-400 dark:text-neutral-500 px-1">Elige una empresa primero</p>}
          </div>
        </div>

        {/* Columna 3: Áreas */}
        <div className="bg-neutral-50 dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 rounded-2xl p-4 shadow-sm ring-1 ring-black/5 dark:ring-white/10 space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-sm">Áreas</h2>
            <button
              onClick={abrirCrearArea}
              disabled={!sitioId}
              className="text-xs font-semibold bg-orange-500 hover:bg-orange-600 text-black px-2.5 py-1.5 rounded-lg transition shadow-sm hover:shadow-md hover:-translate-y-0.5 disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:shadow-sm"
            >
              + Nueva
            </button>
          </div>
          <div className="space-y-1.5">
            {(sitioSeleccionado?.areas ?? []).map((a) => (
              <div key={a.id} className="px-3 py-2.5 rounded-xl bg-white dark:bg-neutral-800">
                <span className="text-sm font-medium block truncate">{a.nombre}</span>
                <div className="flex gap-2 mt-1">
                  <button onClick={() => abrirEditarArea(a)} className="text-[11px] font-medium underline text-neutral-500 dark:text-neutral-400">
                    Editar
                  </button>
                  <button
                    onClick={() => {
                      setGestionando({ tipo: "area", id: a.id, nombre: a.nombre, tieneHijos: false });
                      setErrorGestion("");
                      setConfirmandoEliminar(false);
                    }}
                    className="text-[11px] font-medium underline text-neutral-500 dark:text-neutral-400"
                  >
                    Gestionar
                  </button>
                </div>
              </div>
            ))}
            {sitioSeleccionado && sitioSeleccionado.areas.length === 0 && (
              <p className="text-xs text-neutral-400 dark:text-neutral-500 px-1">Este sitio no tiene áreas aún</p>
            )}
            {!sitioSeleccionado && <p className="text-xs text-neutral-400 dark:text-neutral-500 px-1">Elige un sitio primero</p>}
          </div>
        </div>
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
      <Modal abierto={!!gestionando && !confirmandoEliminar} onCerrar={() => setGestionando(null)} variante="centro" className="bg-white dark:bg-neutral-900 text-black dark:text-white rounded-3xl p-7 w-full max-w-sm space-y-4 shadow-2xl">
            <div>
              <h2 className="font-semibold text-neutral-900 dark:text-white">{gestionando?.nombre}</h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">Elige qué hacer</p>
            </div>

            {errorGestion && <p className="text-sm text-red-600">{errorGestion}</p>}

            <div className="space-y-2">
              {gestionando?.tipo === "empresa" && (
                gestionando?.activo ? (
                  <button
                    onClick={() => cambiarEstadoEmpresa(false)}
                    disabled={procesando}
                    className="w-full text-left px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition disabled:opacity-50"
                  >
                    <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">Desactivar</p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">No aparecerá disponible para nuevos sitios/rutas. Se puede reactivar luego.</p>
                  </button>
                ) : (
                  <button
                    onClick={() => cambiarEstadoEmpresa(true)}
                    disabled={procesando}
                    className="w-full text-left px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition disabled:opacity-50"
                  >
                    <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">Reactivar</p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">Vuelve a estar disponible.</p>
                  </button>
                )
              )}

              <button
                onClick={() => setConfirmandoEliminar(true)}
                disabled={procesando || gestionando?.tieneHijos}
                className="w-full text-left px-4 py-3 rounded-xl border border-red-200 hover:bg-red-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <p className="text-sm font-medium text-red-600">Eliminar definitivamente</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  {gestionando?.tieneHijos
                    ? `No disponible: tiene ${ETIQUETA_HIJOS[gestionando!.tipo]} asociados.`
                    : "La borra por completo. No se puede deshacer."}
                </p>
              </button>
            </div>

            <button
              onClick={() => setGestionando(null)}
              disabled={procesando}
              className="w-full text-center text-sm font-medium text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl py-2.5 transition"
            >
              Cancelar
            </button>
      </Modal>

      <Modal abierto={confirmandoEliminar} onCerrar={() => setConfirmandoEliminar(false)} onConfirmar={eliminar} variante="centro" className="bg-white dark:bg-neutral-900 text-black dark:text-white rounded-3xl p-7 w-full max-w-xs text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto"><IconoAlerta className="w-6 h-6" /></div>
            <p className="font-semibold text-neutral-900 dark:text-white">¿Eliminar {gestionando?.nombre}?</p>
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
                onClick={eliminar}
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