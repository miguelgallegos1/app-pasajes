// components/PanelRutasTH.tsx
// CRUD de Rutas: buscador, switch "solo activas" (encendido por defecto),
// paginación, y modal "Gestionar" que separa Desactivar/Reactivar de Eliminar.

"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import ComboboxBuscable from "./ComboboxBuscable";
import ToggleSwitch from "./ToggleSwitch";
import Paginacion from "./Paginacion";
import Modal from "./Modal";
import Spinner from "./Spinner";
import { useToast } from "./Toast";

type Ruta = {
  id: string;
  numero: number;
  nombre: string;
  valor: number;
  activo: boolean;
  areaLabel: string;
  tieneSolicitudes: boolean;
};
type Opcion = { id: string; label: string };

const POR_PAGINA = 10;

export default function PanelRutasTH({
  rutas,
  areasDisponibles,
  sinAsignaciones,
}: {
  rutas: Ruta[];
  areasDisponibles: Opcion[];
  sinAsignaciones: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [busqueda, setBusqueda] = useState("");
  const [soloActivas, setSoloActivas] = useState(true);
  const [paginaActual, setPaginaActual] = useState(1);

  const rutasFiltradas = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return rutas.filter((r) => {
      if (soloActivas && !r.activo) return false;
      if (!texto) return true;
      return r.nombre.toLowerCase().includes(texto) || r.areaLabel.toLowerCase().includes(texto);
    });
  }, [rutas, busqueda, soloActivas]);

  const totalPaginas = Math.max(1, Math.ceil(rutasFiltradas.length / POR_PAGINA));
  const rutasPagina = useMemo(
    () => rutasFiltradas.slice((paginaActual - 1) * POR_PAGINA, paginaActual * POR_PAGINA),
    [rutasFiltradas, paginaActual]
  );

  const cambiarBusqueda = (v: string) => { setBusqueda(v); setPaginaActual(1); };
  const cambiarSoloActivas = (v: boolean) => { setSoloActivas(v); setPaginaActual(1); };

  const [modalAbierto, setModalAbierto] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [areaId, setAreaId] = useState("");
  const [nombre, setNombre] = useState("");
  const [valor, setValor] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  const [idGestionar, setIdGestionar] = useState<string | null>(null);
  const [procesando, setProcesando] = useState(false);
  const [errorGestion, setErrorGestion] = useState("");

  const abrirCrear = () => {
    setEditandoId(null);
    setAreaId("");
    setNombre("");
    setValor("");
    setError("");
    setModalAbierto(true);
  };

  const abrirEditar = (r: Ruta) => {
    setEditandoId(r.id);
    setNombre(r.nombre);
    setValor(String(r.valor));
    setError("");
    setModalAbierto(true);
  };

  const guardar = async () => {
    const numero = Number(valor);
    if (!nombre.trim() || !valor || isNaN(numero) || numero <= 0) {
      setError("Nombre y valor (mayor a 0) son obligatorios");
      return;
    }
    if (!editandoId && !areaId) {
      setError("Selecciona un área");
      return;
    }

    setGuardando(true);
    setError("");

    const url = editandoId ? `/api/th/rutas/${editandoId}` : "/api/th/rutas";
    const method = editandoId ? "PATCH" : "POST";
    const body = editandoId ? { nombre, valor: numero } : { areaId, nombre, valor: numero };

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setGuardando(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "No se pudo guardar");
      toast.error(data.error ?? "No se pudo guardar la ruta");
      return;
    }
    setModalAbierto(false);
    toast.exito(editandoId ? "Ruta actualizada" : "Ruta creada");
    router.refresh();
  };

  const rutaGestionar = rutas.find((r) => r.id === idGestionar);

  const cambiarEstado = async (nuevoActivo: boolean) => {
    if (!idGestionar) return;
    setProcesando(true);
    setErrorGestion("");
    const res = await fetch(`/api/th/rutas/${idGestionar}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activo: nuevoActivo }),
    });
    setProcesando(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setErrorGestion(data.error ?? "No se pudo actualizar");
      toast.error(data.error ?? "No se pudo actualizar la ruta");
      return;
    }
    setIdGestionar(null);
    toast.exito(nuevoActivo ? "Ruta reactivada" : "Ruta desactivada");
    router.refresh();
  };

  const eliminarPermanente = async () => {
    if (!idGestionar) return;
    setProcesando(true);
    setErrorGestion("");
    const res = await fetch(`/api/th/rutas/${idGestionar}`, { method: "DELETE" });
    setProcesando(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setErrorGestion(data.error ?? "No se pudo eliminar");
      toast.error(data.error ?? "No se pudo eliminar la ruta");
      return;
    }
    setIdGestionar(null);
    toast.exito("Ruta eliminada");
    router.refresh();
  };

  return (
    <div className="flex-1 px-4 sm:px-8 py-5 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-lg sm:text-xl font-bold">Rutas</h1>
        <button
          onClick={abrirCrear}
          disabled={sinAsignaciones}
          className="text-xs sm:text-sm font-semibold bg-orange-500 hover:bg-orange-600 text-black px-3 py-2 rounded-lg transition shadow-sm hover:shadow-md disabled:opacity-40"
        >
          + Nueva ruta
        </button>
      </div>
      <p className="text-xs text-orange-400 font-medium">
        Cada Área puede tener varias rutas (una por cada trayecto)
      </p>

      {sinAsignaciones && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-xl px-4 py-3">
          No tienes ninguna Empresa/Sitio/Área asignada todavía.
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <input
            value={busqueda}
            onChange={(e) => cambiarBusqueda(e.target.value)}
            placeholder="Buscar por nombre o área..."
            className="w-full rounded-xl border border-neutral-700 bg-neutral-900 text-white px-4 py-2.5 text-sm placeholder-neutral-500 focus:border-orange-400 focus:ring-2 focus:ring-orange-500/15 outline-none"
          />
        </div>
        <div className="flex items-center gap-2 bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2.5">
          <ToggleSwitch checked={soloActivas} onChange={cambiarSoloActivas} label="Solo activas" />
        </div>
      </div>

      <div className="bg-neutral-50 text-neutral-800 rounded-2xl overflow-hidden shadow-sm ring-1 ring-black/5">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[680px]">
            <thead className="bg-neutral-100/70 text-neutral-500 text-left">
              <tr>
                <th className="px-4 py-3 font-medium w-12">N°</th>
                <th className="px-4 py-3 font-medium">Área</th>
                <th className="px-4 py-3 font-medium">Ruta</th>
                <th className="px-4 py-3 font-medium">Valor</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {rutasPagina.map((r) => (
                <tr key={r.id} className="border-t border-neutral-200/70 hover:bg-neutral-100/60 transition">
                  <td className="px-4 py-3 text-neutral-400">{r.numero}</td>
                  <td className="px-4 py-3 font-medium">{r.areaLabel}</td>
                  <td className="px-4 py-3 text-neutral-600">{r.nombre}</td>
                  <td className="px-4 py-3">${r.valor.toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${
                        r.activo ? "bg-green-100 text-green-800" : "bg-neutral-200 text-neutral-600"
                      }`}
                    >
                      {r.activo ? "Activa" : "Inactiva"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => abrirEditar(r)}
                        className="text-xs font-medium text-white bg-neutral-700 hover:bg-neutral-800 px-3 py-1.5 rounded-full transition"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => { setIdGestionar(r.id); setErrorGestion(""); }}
                        className="text-xs font-medium text-white bg-red-500 hover:bg-red-600 px-3 py-1.5 rounded-full transition"
                      >
                        Gestionar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {rutasFiltradas.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-neutral-400">
                    {busqueda
                      ? "Sin resultados para esa búsqueda"
                      : soloActivas
                      ? "No hay rutas activas"
                      : "Aún no hay rutas creadas"}
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
        className="bg-white text-black rounded-t-3xl sm:rounded-3xl w-full sm:max-w-sm p-7 space-y-4 shadow-2xl"
      >
            <h2 className="text-lg font-bold text-neutral-900">{editandoId ? "Editar ruta" : "Nueva ruta"}</h2>

            {!editandoId && (
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
            )}

            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Nombre de la ruta
              </label>
              <input
                value={nombre}
                onChange={(e) => setNombre(e.target.value.toUpperCase())}
                className="mt-1.5 w-full rounded-xl border border-neutral-200 px-3.5 py-3 text-sm focus:border-orange-400 focus:ring-2 focus:ring-orange-500/15 outline-none"
                placeholder="Ej: EL YAZNÁN - CAYAMBE - TABACUNDO"
              />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Valor</label>
              <div className="mt-1.5 relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 text-sm">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                  className="w-full rounded-xl border border-neutral-200 pl-7 pr-3.5 py-3 text-sm focus:border-orange-400 focus:ring-2 focus:ring-orange-500/15 outline-none"
                  placeholder="0.90"
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
              <h2 className="font-semibold text-neutral-900">{rutaGestionar?.nombre}</h2>
              <p className="text-xs text-neutral-500 mt-0.5">Elige qué hacer con esta ruta</p>
            </div>

            {errorGestion && <p className="text-sm text-red-600">{errorGestion}</p>}

            <div className="space-y-2">
              {rutaGestionar?.activo ? (
                <button
                  onClick={() => cambiarEstado(false)}
                  disabled={procesando}
                  className="w-full text-left px-4 py-3 rounded-xl border border-neutral-200 hover:bg-neutral-50 transition disabled:opacity-50"
                >
                  <p className="text-sm font-medium text-neutral-800">Desactivar</p>
                  <p className="text-xs text-neutral-500">Deja de estar disponible para nuevas solicitudes. Se puede reactivar luego.</p>
                </button>
              ) : (
                <button
                  onClick={() => cambiarEstado(true)}
                  disabled={procesando}
                  className="w-full text-left px-4 py-3 rounded-xl border border-neutral-200 hover:bg-neutral-50 transition disabled:opacity-50"
                >
                  <p className="text-sm font-medium text-neutral-800">Reactivar</p>
                  <p className="text-xs text-neutral-500">Vuelve a estar disponible para nuevas solicitudes.</p>
                </button>
              )}

              <button
                onClick={eliminarPermanente}
                disabled={procesando || rutaGestionar?.tieneSolicitudes}
                className="w-full text-left px-4 py-3 rounded-xl border border-red-200 hover:bg-red-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <p className="text-sm font-medium text-red-600">Eliminar definitivamente</p>
                <p className="text-xs text-neutral-500">
                  {rutaGestionar?.tieneSolicitudes
                    ? "No disponible: tiene solicitudes registradas en su historial."
                    : "La borra por completo. No se puede deshacer."}
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