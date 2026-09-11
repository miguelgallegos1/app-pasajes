// components/PanelHistorialTH.tsx
// Historial completo para Talento Humano: filtros por fecha, estado y
// colaborador, con total y paginación. Pantalla propia (no modal),
// pensada para escritorio y móvil por igual.

"use client";

import { useState } from "react";
import CalendarioSelector from "./CalendarioSelector";
import SelectorModerno from "./SelectorModerno";
import ComboboxBuscable from "./ComboboxBuscable";
import Paginacion from "./Paginacion";
import Modal from "./Modal";
import Spinner from "./Spinner";
import { useToast } from "./Toast";
import { formatearFecha } from "../lib/fechas";

type Fila = {
  id: string;
  codigo: string;
  fecha: string;
  montoTotal: number;
  estado: string;
  rutaLabel: string;
  nombreColaborador: string;
};

const ESTILOS_ESTADO: Record<string, string> = {
  APROBADA: "bg-green-100 text-green-800",
  PAGADA: "bg-orange-100 text-orange-800",
};

export default function PanelHistorialTH({
  colaboradores,
  sinAsignaciones,
}: {
  colaboradores: { id: string; nombreCompleto: string }[];
  sinAsignaciones: boolean;
}) {
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [estado, setEstado] = useState("");
  const [colaboradorId, setColaboradorId] = useState("");
  const [items, setItems] = useState<Fila[] | null>(null);
  const [totalMonto, setTotalMonto] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const toast = useToast();

  const [idARevertir, setIdARevertir] = useState<string | null>(null);
  const [motivoRevertir, setMotivoRevertir] = useState("");
  const [revirtiendo, setRevirtiendo] = useState(false);
  const [errorRevertir, setErrorRevertir] = useState("");

  const opcionesColaborador = [
    { id: "", label: "Todos los colaboradores" },
    ...colaboradores.map((c) => ({ id: c.id, label: c.nombreCompleto })),
  ];

  const buscar = async (paginaNueva = 1) => {
    if (!desde || !hasta) {
      setError("Selecciona ambas fechas");
      return;
    }
    setCargando(true);
    setError("");
    const params = new URLSearchParams({ desde, hasta, pagina: String(paginaNueva) });
    if (estado) params.set("estado", estado);
    if (colaboradorId) params.set("colaboradorId", colaboradorId);

    try {
      const res = await fetch(`/api/th/historial?${params.toString()}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "No se pudo cargar el historial");
        return;
      }
      const data = await res.json();
      setItems(data.items);
      setTotalMonto(data.totalMonto);
      setTotalPaginas(data.totalPaginas);
      setPagina(paginaNueva);
    } catch {
      setError("No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setCargando(false);
    }
  };

  const abrirRevertir = (id: string) => {
    setIdARevertir(id);
    setMotivoRevertir("");
    setErrorRevertir("");
  };

  const confirmarRevertir = async () => {
    if (!idARevertir) return;
    if (motivoRevertir.trim().length < 3) {
      setErrorRevertir("Escribe el motivo de la corrección (mínimo 3 caracteres)");
      return;
    }
    setRevirtiendo(true);
    setErrorRevertir("");
    try {
      const res = await fetch(`/api/solicitudes/${idARevertir}/revertir`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ motivo: motivoRevertir }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErrorRevertir(data.error ?? "No se pudo revertir la solicitud");
        toast.error(data.error ?? "No se pudo revertir la solicitud");
        return;
      }
      setIdARevertir(null);
      toast.exito("Solicitud devuelta a Pendiente");
      buscar(pagina);
    } catch {
      setErrorRevertir("No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.");
      toast.error("No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setRevirtiendo(false);
    }
  };

  return (
    <div className="flex-1 px-4 sm:px-8 py-5 space-y-4">
      <h1 className="text-lg sm:text-xl font-bold">Historial</h1>
      <p className="text-xs text-orange-400 font-medium">Solicitudes Aprobadas y Pagadas</p>

      {sinAsignaciones && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-xl px-4 py-3">
          No tienes ninguna Empresa/Sitio/Área asignada todavía.
        </div>
      )}

      <div className="bg-neutral-50 rounded-2xl p-5 shadow-sm ring-1 ring-black/5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Desde</label>
            <div className="mt-1.5">
              <CalendarioSelector value={desde} onChange={setDesde} />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Hasta</label>
            <div className="mt-1.5">
              <CalendarioSelector value={hasta} onChange={setHasta} />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Estado</label>
            <div className="mt-1.5">
              <SelectorModerno
                opciones={[
                  { value: "", label: "Todas" },
                  { value: "APROBADA", label: "Aprobada" },
                  { value: "PAGADA", label: "Pagada" },
                ]}
                value={estado}
                onChange={setEstado}
                placeholder="Todas"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Colaborador</label>
            <div className="mt-1.5">
              <ComboboxBuscable
                opciones={opcionesColaborador}
                value={colaboradorId}
                onChange={setColaboradorId}
                placeholder="Todos"
              />
            </div>
          </div>
        </div>

        <button
          onClick={() => buscar(1)}
          disabled={cargando || sinAsignaciones}
          className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-5 py-2.5 rounded-xl transition shadow-sm hover:shadow-md disabled:opacity-50"
        >
          {cargando ? "Buscando..." : "Buscar"}
        </button>

        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      {items && (
        <div className="bg-white text-neutral-800 rounded-2xl overflow-hidden shadow-sm ring-1 ring-black/5">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-neutral-100 text-neutral-500 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Código</th>
                  <th className="px-4 py-3 font-medium">Fecha</th>
                  <th className="px-4 py-3 font-medium">Colaborador</th>
                  <th className="px-4 py-3 font-medium">Ruta</th>
                  <th className="px-4 py-3 font-medium">Valor</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((s) => (
                  <tr key={s.id} className="border-t border-neutral-100 hover:bg-neutral-50 transition">
                    <td className="px-4 py-3 font-mono font-bold tracking-widest text-neutral-500">{s.codigo}</td>
                    <td className="px-4 py-3">{formatearFecha(s.fecha)}</td>
                    <td className="px-4 py-3">{s.nombreColaborador}</td>
                    <td className="px-4 py-3 text-neutral-600">{s.rutaLabel}</td>
                    <td className="px-4 py-3">${s.montoTotal.toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${ESTILOS_ESTADO[s.estado]}`}>
                        {s.estado}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {s.estado === "APROBADA" && (
                        <button
                          onClick={() => abrirRevertir(s.id)}
                          className="text-xs font-medium text-white bg-neutral-700 hover:bg-neutral-800 px-3 py-1.5 rounded-full transition"
                        >
                          Revertir a pendiente
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-neutral-400">
                      No hay resultados en ese rango
                    </td>
                  </tr>
                )}
              </tbody>
              {items.length > 0 && (
                <tfoot>
                  <tr className="border-t border-neutral-200 bg-neutral-50 font-semibold">
                    <td className="px-4 py-3" colSpan={4}>Total del rango</td>
                    <td className="px-4 py-3" colSpan={3}>${totalMonto.toFixed(2)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
          <Paginacion paginaActual={pagina} totalPaginas={totalPaginas} onCambiarPagina={buscar} deshabilitado={cargando} />
        </div>
      )}

      <Modal abierto={!!idARevertir} className="bg-white text-black rounded-t-3xl sm:rounded-3xl w-full sm:max-w-sm p-7 space-y-4 shadow-2xl">
        <div>
          <h2 className="font-semibold text-neutral-900">Revertir a Pendiente</h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            La solicitud vuelve a la cola de aprobación. Usalo solo para corregir un error de control.
          </p>
        </div>
        <textarea
          value={motivoRevertir}
          onChange={(e) => setMotivoRevertir(e.target.value.toUpperCase())}
          rows={3}
          autoFocus
          className="w-full rounded-xl border border-neutral-200 px-3.5 py-3 text-sm focus:border-orange-400 focus:ring-2 focus:ring-orange-500/15 outline-none resize-none"
          placeholder="Ej: Se aprobó por error, ruta incorrecta..."
        />
        {errorRevertir && <p className="text-sm text-red-600">{errorRevertir}</p>}
        <div className="flex gap-2 justify-end pt-1">
          <button
            onClick={() => setIdARevertir(null)}
            disabled={revirtiendo}
            className="px-4 py-2.5 text-sm font-medium text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100 rounded-xl transition"
          >
            Cancelar
          </button>
          <button
            onClick={confirmarRevertir}
            disabled={revirtiendo}
            className="px-5 py-2.5 text-sm font-semibold bg-neutral-800 hover:bg-neutral-900 text-white rounded-xl disabled:opacity-50 transition flex items-center justify-center gap-2"
          >
            {revirtiendo && <Spinner className="w-4 h-4" />}
            {revirtiendo ? "Guardando..." : "Revertir"}
          </button>
        </div>
      </Modal>
    </div>
  );
}