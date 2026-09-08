// components/PanelTH.tsx
// Panel de Talento Humano: buscador, cola de solicitudes PENDIENTES con
// selección múltiple para aprobar en lote, "Devolver para corrección",
// paginación, total, y aviso si no tiene áreas asignadas.

"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Paginacion from "./Paginacion";
import Modal from "./Modal";
import { formatearFecha } from "../lib/fechas";
import Spinner from "./Spinner";
import { useToast } from "./Toast";

type Pendiente = {
  id: string;
  codigo: string;
  fecha: string;
  fechaSolicitud: string;
  montoTotal: number;
  observaciones: string | null;
  nombreColaborador: string;
  rutaLabel: string;
};

const POR_PAGINA = 8;

export default function PanelTH({
  esSuperAdmin,
  sinAsignaciones,
  pendientes,
}: {
  esSuperAdmin: boolean;
  sinAsignaciones: boolean;
  pendientes: Pendiente[];
}) {
  const router = useRouter();
  const toast = useToast();

  const [busqueda, setBusqueda] = useState("");
  const [paginaActual, setPaginaActual] = useState(1);

  const pendientesFiltradas = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    if (!texto) return pendientes;
    return pendientes.filter(
      (p) =>
        p.codigo.toLowerCase().includes(texto) ||
        p.nombreColaborador.toLowerCase().includes(texto) ||
        p.rutaLabel.toLowerCase().includes(texto) ||
        (p.observaciones ?? "").toLowerCase().includes(texto)
    );
  }, [pendientes, busqueda]);

  const cambiarBusqueda = (v: string) => {
    setBusqueda(v);
    setPaginaActual(1);
  };

  const totalPaginas = Math.max(1, Math.ceil(pendientesFiltradas.length / POR_PAGINA));
  const pendientesPagina = useMemo(
    () => pendientesFiltradas.slice((paginaActual - 1) * POR_PAGINA, paginaActual * POR_PAGINA),
    [pendientesFiltradas, paginaActual]
  );
  const totalGeneral = useMemo(
    () => pendientesFiltradas.reduce((acc, s) => acc + s.montoTotal, 0),
    [pendientesFiltradas]
  );

  const [seleccionadas, setSeleccionadas] = useState<Set<string>>(new Set());
  const todasEnPaginaSeleccionadas =
    pendientesPagina.length > 0 && pendientesPagina.every((s) => seleccionadas.has(s.id));

  const alternarSeleccion = (id: string) => {
    setSeleccionadas((prev) => {
      const copia = new Set(prev);
      copia.has(id) ? copia.delete(id) : copia.add(id);
      return copia;
    });
  };

  const alternarSeleccionarTodo = () => {
    setSeleccionadas((prev) => {
      const copia = new Set(prev);
      if (todasEnPaginaSeleccionadas) {
        pendientesPagina.forEach((s) => copia.delete(s.id));
      } else {
        pendientesPagina.forEach((s) => copia.add(s.id));
      }
      return copia;
    });
  };

  const [idAAprobar, setIdAAprobar] = useState<string | null>(null);
  const [aprobandoLote, setAprobandoLote] = useState(false);
  const [confirmandoLote, setConfirmandoLote] = useState(false);
  const [aprobando, setAprobando] = useState(false);

  const [idADevolver, setIdADevolver] = useState<string | null>(null);
  const [comentarioDevolucion, setComentarioDevolucion] = useState("");
  const [devolviendo, setDevolviendo] = useState(false);

  const [error, setError] = useState("");

  const confirmarAprobar = async () => {
    if (!idAAprobar) return;
    setAprobando(true);
    setError("");
    const res = await fetch(`/api/solicitudes/${idAAprobar}/aprobar`, { method: "PATCH" });
    setAprobando(false);
    setIdAAprobar(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "No se pudo aprobar");
      toast.error(data.error ?? "No se pudo aprobar la solicitud");
      return;
    }
    toast.exito("Solicitud aprobada");
    router.refresh();
  };

  const confirmarAprobarLote = async () => {
    setAprobandoLote(true);
    setError("");
    const res = await fetch(`/api/solicitudes/aprobar-lote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: Array.from(seleccionadas) }),
    });
    setAprobandoLote(false);
    setConfirmandoLote(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "No se pudo aprobar el lote");
      toast.error(data.error ?? "No se pudo aprobar el lote");
      return;
    }
    toast.exito("Solicitudes aprobadas");
    setSeleccionadas(new Set());
    router.refresh();
  };

  const abrirModalDevolucion = (id: string) => {
    setIdADevolver(id);
    setComentarioDevolucion("");
    setError("");
  };

  const confirmarDevolucion = async () => {
    if (!idADevolver) return;
    if (comentarioDevolucion.trim().length < 3) {
      setError("Escribe qué se debe corregir (mínimo 3 caracteres)");
      return;
    }
    setDevolviendo(true);
    setError("");
    const res = await fetch(`/api/solicitudes/${idADevolver}/rechazar`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ comentario: comentarioDevolucion }),
    });
    setDevolviendo(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "No se pudo devolver la solicitud");
      toast.error(data.error ?? "No se pudo devolver la solicitud");
      return;
    }
    toast.exito("Solicitud devuelta para corrección");
    setIdADevolver(null);
    router.refresh();
  };

  return (
    <div className="flex flex-col">
      <div className="flex-1 px-4 sm:px-8 py-5 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-lg sm:text-xl font-bold">Aprobaciones Pendientes</h1>
          {seleccionadas.size > 0 && (
            <button
              onClick={() => setConfirmandoLote(true)}
              className="text-xs sm:text-sm font-semibold bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg transition shadow-sm hover:shadow-md"
            >
              Aprobar seleccionadas ({seleccionadas.size})
            </button>
          )}
        </div>
        <p className="text-xs text-orange-400 font-medium">
          Rol: {esSuperAdmin ? "Super Administrador" : "Talento Humano"}
        </p>

        {sinAsignaciones && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-xl px-4 py-3">
            Todavía no tienes ninguna Empresa/Sitio/Área asignada. Pide al Super Administrador que te
            asigne al menos una para poder ver solicitudes.
          </div>
        )}

        <div className="relative max-w-sm">
          <input
            value={busqueda}
            onChange={(e) => cambiarBusqueda(e.target.value)}
            placeholder="Buscar por código, colaborador, ruta u observación..."
            className="w-full rounded-xl border border-neutral-700 bg-neutral-900 text-white px-4 py-2.5 text-sm placeholder-neutral-500 focus:border-orange-400 focus:ring-2 focus:ring-orange-500/15 outline-none"
          />
        </div>

        <div className="bg-neutral-50 text-neutral-800 rounded-2xl overflow-hidden shadow-sm ring-1 ring-black/5">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[720px]">
              <thead className="bg-neutral-100/70 text-neutral-500 text-left">
                <tr>
                  <th className="px-4 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={todasEnPaginaSeleccionadas}
                      onChange={alternarSeleccionarTodo}
                      className="w-4 h-4 accent-orange-500 rounded"
                    />
                  </th>
                  <th className="px-4 py-3 font-medium">Código</th>
                  <th className="px-4 py-3 font-medium">Fecha</th>
                  <th className="px-4 py-3 font-medium">Colaborador</th>
                  <th className="px-4 py-3 font-medium">Ruta</th>
                  <th className="px-4 py-3 font-medium">Valor</th>
                  <th className="px-4 py-3 font-medium">Observaciones</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {pendientesPagina.map((s) => (
                  <tr key={s.id} className="border-t border-neutral-200/70 hover:bg-neutral-100/60 transition">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={seleccionadas.has(s.id)}
                        onChange={() => alternarSeleccion(s.id)}
                        className="w-4 h-4 accent-orange-500 rounded"
                      />
                    </td>
                    <td className="px-4 py-3 font-mono font-bold tracking-widest text-neutral-500">{s.codigo}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{formatearFecha(s.fecha)}</p>
                      <p className="text-[11px] text-neutral-400">
                        Registrado: {new Date(s.fechaSolicitud).toLocaleString("es-EC", {
                          day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
                        })}
                      </p>
                    </td>
                    <td className="px-4 py-3">{s.nombreColaborador}</td>
                    <td className="px-4 py-3 text-neutral-600">{s.rutaLabel}</td>
                    <td className="px-4 py-3">${s.montoTotal.toFixed(2)}</td>
                    <td className="px-4 py-3 text-neutral-500 max-w-[160px] truncate" title={s.observaciones ?? ""}>
                      {s.observaciones || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => setIdAAprobar(s.id)}
                          className="text-xs font-medium text-white bg-green-600 hover:bg-green-700 px-3 py-1.5 rounded-full transition"
                        >
                          Aprobar
                        </button>
                        <button
                          onClick={() => abrirModalDevolucion(s.id)}
                          className="text-xs font-medium text-white bg-neutral-700 hover:bg-neutral-800 px-3 py-1.5 rounded-full transition"
                        >
                          Devolver
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {pendientesFiltradas.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-neutral-400">
                      {busqueda
                        ? "Sin resultados para esa búsqueda"
                        : sinAsignaciones
                        ? "Sin áreas asignadas"
                        : "No hay solicitudes pendientes 🎉"}
                    </td>
                  </tr>
                )}
              </tbody>

              {pendientesFiltradas.length > 0 && (
                <tfoot>
                  <tr className="border-t border-neutral-200 bg-neutral-100/70 font-semibold">
                    <td className="px-4 py-3" colSpan={5}>
                      Total ({pendientesFiltradas.length} {pendientesFiltradas.length === 1 ? "solicitud" : "solicitudes"})
                    </td>
                    <td className="px-4 py-3">${totalGeneral.toFixed(2)}</td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          <Paginacion paginaActual={paginaActual} totalPaginas={totalPaginas} onCambiarPagina={setPaginaActual} />
        </div>
      </div>

      <Modal abierto={!!idAAprobar} variante="centro" className="bg-white text-black rounded-3xl p-7 w-full max-w-xs text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-green-100 text-green-600 flex items-center justify-center mx-auto text-2xl">✓</div>
            <p className="font-semibold text-neutral-900">¿Aprobar esta solicitud?</p>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-2 justify-center pt-1">
              <button
                onClick={() => setIdAAprobar(null)}
                disabled={aprobando}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-neutral-600 border border-neutral-200 rounded-xl hover:bg-neutral-100 transition"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarAprobar}
                disabled={aprobando}
                className="flex-1 px-4 py-2.5 text-sm font-semibold bg-green-600 hover:bg-green-700 text-white rounded-xl disabled:opacity-50 transition flex items-center justify-center gap-2"
              >
                {aprobando && <Spinner className="w-4 h-4" />}
                {aprobando ? "Aprobando..." : "Aprobar"}
              </button>
            </div>
      </Modal>

      <Modal abierto={confirmandoLote} variante="centro" className="bg-white text-black rounded-3xl p-7 w-full max-w-xs text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-green-100 text-green-600 flex items-center justify-center mx-auto text-2xl">✓</div>
            <p className="font-semibold text-neutral-900">¿Aprobar {seleccionadas.size} solicitudes?</p>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-2 justify-center pt-1">
              <button
                onClick={() => setConfirmandoLote(false)}
                disabled={aprobandoLote}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-neutral-600 border border-neutral-200 rounded-xl hover:bg-neutral-100 transition"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarAprobarLote}
                disabled={aprobandoLote}
                className="flex-1 px-4 py-2.5 text-sm font-semibold bg-green-600 hover:bg-green-700 text-white rounded-xl disabled:opacity-50 transition flex items-center justify-center gap-2"
              >
                {aprobandoLote && <Spinner className="w-4 h-4" />}
                {aprobandoLote ? "Aprobando..." : "Aprobar todas"}
              </button>
            </div>
      </Modal>

      <Modal abierto={!!idADevolver} variante="centro" className="bg-white text-black rounded-3xl p-7 w-full max-w-sm space-y-4 shadow-2xl">
            <div>
              <h2 className="font-semibold text-neutral-900">Devolver para corrección</h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                La solicitud sigue pendiente; el colaborador verá esta nota y podrá corregirla
              </p>
            </div>
            <textarea
              value={comentarioDevolucion}
              onChange={(e) => setComentarioDevolucion(e.target.value.toUpperCase())}
              rows={3}
              autoFocus
              className="w-full rounded-xl border border-neutral-200 px-3.5 py-3 text-sm focus:border-orange-400 focus:ring-2 focus:ring-orange-500/15 outline-none resize-none"
              placeholder="Ej: Ruta incorrecta para tu área, favor corregir..."
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-2 justify-end pt-1">
              <button
                onClick={() => setIdADevolver(null)}
                disabled={devolviendo}
                className="px-4 py-2.5 text-sm font-medium text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100 rounded-xl transition"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarDevolucion}
                disabled={devolviendo}
                className="px-5 py-2.5 text-sm font-semibold bg-neutral-800 hover:bg-neutral-900 text-white rounded-xl disabled:opacity-50 transition flex items-center justify-center gap-2"
              >
                {devolviendo && <Spinner className="w-4 h-4" />}
                {devolviendo ? "Enviando..." : "Devolver"}
              </button>
            </div>
      </Modal>
    </div>
  );
}