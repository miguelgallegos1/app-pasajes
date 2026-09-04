// components/PanelColaborador.tsx
// Parte interactiva del panel del colaborador: tabla + modal de nueva solicitud.

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Solicitud = {
  id: string;
  frecuencia: string;
  cantidadPasajes: number;
  montoTotal: number;
  estado: string;
  fechaSolicitud: string;
  comentario: string | null;
};

const ESTILOS_ESTADO: Record<string, string> = {
  PENDIENTE: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  APROBADA: "bg-green-500/15 text-green-400 border-green-500/30",
  RECHAZADA: "bg-red-500/15 text-red-400 border-red-500/30",
  PAGADA: "bg-orange-500/15 text-orange-400 border-orange-500/30",
};

const ETIQUETAS_FRECUENCIA: Record<string, string> = {
  DIARIA: "Diaria",
  SEMANAL: "Semanal",
  MENSUAL: "Mensual",
  ANUAL: "Anual",
};

export default function PanelColaborador({
  nombreCompleto,
  nombreRuta,
  solicitudes,
}: {
  nombreCompleto: string;
  nombreRuta: string;
  solicitudes: Solicitud[];
}) {
  const [modalAbierto, setModalAbierto] = useState(false);
  const [frecuencia, setFrecuencia] = useState("DIARIA");
  const [cantidad, setCantidad] = useState(1);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const crearSolicitud = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    setError("");

    const res = await fetch("/api/solicitudes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ frecuencia, cantidadPasajes: cantidad }),
    });

    setEnviando(false);

    if (!res.ok) {
      setError("No se pudo crear la solicitud");
      return;
    }

    setModalAbierto(false);
    setFrecuencia("DIARIA");
    setCantidad(1);
    router.refresh(); // recarga los datos del servidor sin perder el estado del cliente
  };

  const eliminarSolicitud = async (id: string) => {
    const confirmado = confirm("¿Seguro que quieres eliminar esta solicitud?");
    if (!confirmado) return;

    const res = await fetch(`/api/solicitudes/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? "No se pudo eliminar");
      return;
    }
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-black text-white p-4 sm:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Encabezado */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold">Hola, {nombreCompleto}</h1>
            <p className="text-sm text-neutral-400">Ruta: {nombreRuta}</p>
          </div>
          <button
            onClick={() => setModalAbierto(true)}
            className="bg-orange-500 hover:bg-orange-600 text-black font-semibold px-4 py-2 rounded-lg transition"
          >
            + Nueva solicitud
          </button>
        </div>

        {/* Tabla de historial */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-neutral-800/50 text-neutral-400 text-left">
              <tr>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Frecuencia</th>
                <th className="px-4 py-3">Monto</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {solicitudes.map((s) => (
                <tr key={s.id} className="border-t border-neutral-800">
                  <td className="px-4 py-3 text-neutral-300">
                    {new Date(s.fechaSolicitud).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-neutral-300">
                    {ETIQUETAS_FRECUENCIA[s.frecuencia] ?? s.frecuencia}
                  </td>
                  <td className="px-4 py-3 text-neutral-300">
                    ${s.montoTotal.toFixed(2)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2 py-1 rounded-full border ${ESTILOS_ESTADO[s.estado]}`}
                    >
                      {s.estado}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {s.estado === "PENDIENTE" && (
                      <button
                        onClick={() => eliminarSolicitud(s.id)}
                        className="text-red-400 hover:text-red-300 text-xs"
                      >
                        Eliminar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {solicitudes.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-neutral-500">
                    Aún no tienes solicitudes registradas
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de nueva solicitud */}
      {modalAbierto && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <form
            onSubmit={crearSolicitud}
            className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 w-full max-w-sm space-y-4"
          >
            <h2 className="text-lg font-semibold">Nueva solicitud de pasajes</h2>

            <div>
              <label className="text-sm text-neutral-400">Frecuencia</label>
              <select
                value={frecuencia}
                onChange={(e) => setFrecuencia(e.target.value)}
                className="mt-1 w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white focus:border-orange-500 outline-none"
              >
                <option value="DIARIA">Diaria</option>
                <option value="SEMANAL">Semanal</option>
                <option value="MENSUAL">Mensual</option>
                <option value="ANUAL">Anual</option>
              </select>
            </div>

            <div>
              <label className="text-sm text-neutral-400">Cantidad de pasajes</label>
              <input
                type="number"
                min={1}
                value={cantidad}
                onChange={(e) => setCantidad(Number(e.target.value))}
                className="mt-1 w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white focus:border-orange-500 outline-none"
              />
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setModalAbierto(false)}
                className="px-4 py-2 text-sm text-neutral-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={enviando}
                className="px-4 py-2 text-sm bg-orange-500 hover:bg-orange-600 text-black font-semibold rounded-lg disabled:opacity-50"
              >
                {enviando ? "Enviando..." : "Enviar solicitud"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}