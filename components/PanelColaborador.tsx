// components/PanelColaborador.tsx
// Panel del colaborador/supervisor: header, tabla (Pendientes/Aprobadas,
// propias + del equipo si es Supervisor), formulario con comboboxes
// buscables, historial de pagos, y confirmaciones con diseño propio.

"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Header from "./Header";
import CalendarioSelector from "./CalendarioSelector";
import ComboboxBuscable from "./ComboboxBuscable";
import ModalHistorial from "./ModalHistorial";
import { APP_VERSION, APP_DESARROLLADOR } from "../lib/config";

type Solicitud = {
  id: string;
  fecha: string;
  fechaSolicitud: string;
  montoTotal: number;
  estado: string;
  observaciones: string | null;
  rutaLabel: string;
  nombreColaborador: string;
};

type RutaSimple = { id: string; valor: number; label: string };
type MiembroEquipo = { id: string; nombreCompleto: string };

const ESTILOS_ESTADO: Record<string, string> = {
  PENDIENTE: "bg-amber-100 text-amber-800",
  APROBADA: "bg-green-100 text-green-800",
  RECHAZADA: "bg-red-100 text-red-800",
  PAGADA: "bg-orange-100 text-orange-800",
};

const CLASE_CAMPO =
  "mt-1.5 w-full rounded-xl border border-neutral-200 px-3.5 py-3 text-sm text-neutral-900 " +
  "transition hover:border-neutral-300 focus:border-orange-400 focus:ring-2 focus:ring-orange-500/15 outline-none";

export default function PanelColaborador({
  colaboradorId,
  nombreCompleto,
  fotoUrl,
  esSupervisor,
  equipo,
  rutasPropias,
  solicitudes,
}: {
  colaboradorId: string;
  nombreCompleto: string;
  fotoUrl: string | null;
  esSupervisor: boolean;
  equipo: MiembroEquipo[];
  rutasPropias: RutaSimple[];
  solicitudes: Solicitud[];
}) {
  const router = useRouter();

  const [modalAbierto, setModalAbierto] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [historialAbierto, setHistorialAbierto] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");

  const [idAEliminar, setIdAEliminar] = useState<string | null>(null);
  const [eliminando, setEliminando] = useState(false);

  const [colaboradorSeleccionado, setColaboradorSeleccionado] = useState(colaboradorId);
  const [fecha, setFecha] = useState("");
  const [rutaId, setRutaId] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [rutasDisponibles, setRutasDisponibles] = useState<RutaSimple[]>(rutasPropias);
  const [cargandoRutas, setCargandoRutas] = useState(false);

  const opcionesColaborador = useMemo(
    () => [
      { id: colaboradorId, label: `${nombreCompleto} (yo)` },
      ...equipo.map((c) => ({ id: c.id, label: c.nombreCompleto })),
    ],
    [colaboradorId, nombreCompleto, equipo]
  );

  const opcionesRutas = useMemo(
    () => rutasDisponibles.map((r) => ({ id: r.id, label: `${r.label} — $${r.valor.toFixed(2)}` })),
    [rutasDisponibles]
  );

  const valorSeleccionado = useMemo(
    () => rutasDisponibles.find((r) => r.id === rutaId)?.valor ?? null,
    [rutaId, rutasDisponibles]
  );

  const fechaMinima = useMemo(() => {
    const limite = new Date();
    limite.setDate(limite.getDate() - 2);
    const y = limite.getFullYear();
    const m = String(limite.getMonth() + 1).padStart(2, "0");
    const d = String(limite.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, []);

  const cambiarColaborador = async (nuevoId: string) => {
    setColaboradorSeleccionado(nuevoId);
    setRutaId("");
    if (nuevoId === colaboradorId) {
      setRutasDisponibles(rutasPropias);
      return;
    }
    setCargandoRutas(true);
    const res = await fetch(`/api/rutas?colaboradorId=${nuevoId}`);
    setCargandoRutas(false);
    if (res.ok) setRutasDisponibles(await res.json());
  };

  const abrirModal = () => {
    setModalAbierto(true);
    setColaboradorSeleccionado(colaboradorId);
    setRutasDisponibles(rutasPropias);
    setFecha("");
    setRutaId("");
    setObservaciones("");
    setError("");
  };

  const confirmarRegistro = async () => {
    setEnviando(true);
    setError("");
    const res = await fetch("/api/solicitudes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ colaboradorId: colaboradorSeleccionado, rutaId, fecha, observaciones }),
    });
    setEnviando(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "No se pudo registrar el pasaje");
      setConfirmando(false);
      return;
    }
    setConfirmando(false);
    setModalAbierto(false);
    router.refresh();
  };

  const confirmarEliminacion = async () => {
    if (!idAEliminar) return;
    setEliminando(true);
    const res = await fetch(`/api/solicitudes/${idAEliminar}`, { method: "DELETE" });
    setEliminando(false);
    setIdAEliminar(null);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "No se pudo eliminar");
      return;
    }
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <Header nombreCompleto={nombreCompleto} fotoUrl={fotoUrl} />

      <main className="flex-1 px-4 sm:px-8 py-5 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-lg sm:text-xl font-bold">Mis Pasajes</h1>
          <div className="flex gap-2">
            <button
              onClick={() => setHistorialAbierto(true)}
              className="text-xs sm:text-sm font-medium border border-neutral-700 text-neutral-300 px-3 py-2 rounded-lg hover:bg-neutral-900 hover:border-neutral-600 transition"
            >
              Historial
            </button>
            <button
              onClick={abrirModal}
              className="text-xs sm:text-sm font-semibold bg-orange-500 hover:bg-orange-600 text-black px-3 py-2 rounded-lg transition shadow-sm hover:shadow-md"
            >
              + Nueva solicitud
            </button>
          </div>
        </div>

        {esSupervisor && (
          <p className="text-xs text-orange-400">
            Cuentas con acceso de Supervisor — viendo tus solicitudes y las de tu equipo
          </p>
        )}

        <div className="bg-white text-black rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[620px]">
              <thead className="bg-neutral-50 text-neutral-500 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Fecha</th>
                  {esSupervisor && <th className="px-4 py-3 font-medium">Colaborador</th>}
                  <th className="px-4 py-3 font-medium">Ruta</th>
                  <th className="px-4 py-3 font-medium">Valor</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {solicitudes.map((s) => (
                  <tr key={s.id} className="border-t border-neutral-100">
                    <td className="px-4 py-3">
                      <p className="font-medium">{new Date(s.fecha).toLocaleDateString()}</p>
                      <p className="text-[11px] text-neutral-400">
                        Registrado: {new Date(s.fechaSolicitud).toLocaleString("es-EC", {
                          day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
                        })}
                      </p>
                    </td>
                    {esSupervisor && (
                      <td className="px-4 py-3">
                        {s.nombreColaborador}
                        {s.nombreColaborador === nombreCompleto && (
                          <span className="text-[10px] text-neutral-400 ml-1">(yo)</span>
                        )}
                      </td>
                    )}
                    <td className="px-4 py-3">{s.rutaLabel}</td>
                    <td className="px-4 py-3">${s.montoTotal.toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${ESTILOS_ESTADO[s.estado]}`}>
                        {s.estado}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {s.estado === "PENDIENTE" && (
                        <button
                          onClick={() => setIdAEliminar(s.id)}
                          className="text-xs font-medium text-white bg-red-500 hover:bg-red-600 px-3 py-1.5 rounded-full transition"
                        >
                          Eliminar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {solicitudes.length === 0 && (
                  <tr>
                    <td colSpan={esSupervisor ? 6 : 5} className="px-4 py-10 text-center text-neutral-400">
                      Aún no hay solicitudes registradas
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <footer className="text-center text-[11px] text-neutral-600 py-4 border-t border-neutral-900">
        Desarrollado por {APP_DESARROLLADOR} · v{APP_VERSION}
      </footer>

      {modalAbierto && !confirmando && (
        <div className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white text-black rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md p-7 space-y-5 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div>
              <h2 className="text-lg font-bold text-neutral-900">Registrar pasaje del día</h2>
              <p className="text-xs text-neutral-500 mt-0.5">Completa los datos del viaje</p>
            </div>

            {esSupervisor && (
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  ¿Para quién es esta solicitud?
                </label>
                <div className="mt-1.5">
                  <ComboboxBuscable
                    opciones={opcionesColaborador}
                    value={colaboradorSeleccionado}
                    onChange={cambiarColaborador}
                    placeholder="Selecciona un colaborador"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Fecha</label>
              <div className="mt-1.5">
                <CalendarioSelector value={fecha} onChange={setFecha} fechaMinima={fechaMinima} />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Ruta</label>
              <div className="mt-1.5">
                <ComboboxBuscable
                  opciones={opcionesRutas}
                  value={rutaId}
                  onChange={setRutaId}
                  placeholder="Selecciona una ruta"
                  cargando={cargandoRutas}
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Valor</label>
              <input
                type="text"
                readOnly
                value={valorSeleccionado !== null ? `$${valorSeleccionado.toFixed(2)}` : ""}
                placeholder="Se llena al elegir la ruta"
                className="mt-1.5 w-full rounded-xl border border-neutral-100 bg-neutral-50 text-neutral-600 px-3.5 py-3 text-sm cursor-not-allowed"
              />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Observaciones (opcional)
              </label>
              <textarea
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                rows={2}
                className={`${CLASE_CAMPO} resize-none`}
                placeholder="Algún comentario adicional..."
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex gap-2 justify-end pt-1">
              <button
                type="button"
                onClick={() => setModalAbierto(false)}
                className="px-4 py-2.5 text-sm font-medium text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100 rounded-xl transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!fecha || !rutaId}
                onClick={() => setConfirmando(true)}
                className="px-5 py-2.5 text-sm font-semibold bg-orange-500 hover:bg-orange-600 text-white rounded-xl disabled:opacity-40 transition shadow-sm hover:shadow-md"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmando && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4">
          <div className="bg-white text-black rounded-3xl p-7 w-full max-w-xs text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center mx-auto text-2xl">?</div>
            <p className="font-semibold text-neutral-900">¿Seguro que quieres registrar este pasaje?</p>
            <p className="text-sm text-neutral-500">{fecha} · ${valorSeleccionado?.toFixed(2)}</p>
            <div className="flex gap-2 justify-center pt-1">
              <button
                onClick={() => setConfirmando(false)}
                disabled={enviando}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-neutral-600 border border-neutral-200 rounded-xl hover:bg-neutral-100 transition"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarRegistro}
                disabled={enviando}
                className="flex-1 px-4 py-2.5 text-sm font-semibold bg-orange-500 hover:bg-orange-600 text-white rounded-xl disabled:opacity-50 transition"
              >
                {enviando ? "Guardando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {idAEliminar && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4">
          <div className="bg-white text-black rounded-3xl p-7 w-full max-w-xs text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto text-2xl">!</div>
            <p className="font-semibold text-neutral-900">¿Eliminar esta solicitud?</p>
            <p className="text-sm text-neutral-500">Esta acción no se puede deshacer.</p>
            <div className="flex gap-2 justify-center pt-1">
              <button
                onClick={() => setIdAEliminar(null)}
                disabled={eliminando}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-neutral-600 border border-neutral-200 rounded-xl hover:bg-neutral-100 transition"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarEliminacion}
                disabled={eliminando}
                className="flex-1 px-4 py-2.5 text-sm font-semibold bg-red-500 hover:bg-red-600 text-white rounded-xl disabled:opacity-50 transition"
              >
                {eliminando ? "Eliminando..." : "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {historialAbierto && <ModalHistorial onCerrar={() => setHistorialAbierto(false)} />}
    </div>
  );
}