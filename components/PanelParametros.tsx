// components/PanelParametros.tsx
// Parámetros generales del sistema:
// - Desde cuántos días atrás se puede elegir una fecha en el calendario de
//   nueva solicitud (propia, la que crea TH en nombre de un colaborador, y
//   "copiar rutas"). Antes estaba quemado en el código (-2 días).
// - En qué pantallas aparece "Seleccionar todas (N)" para procesar en
//   bloque todo lo filtrado (no solo la página visible).

"use client";

import { useState, useEffect } from "react";
import Spinner from "./Spinner";
import { useReportarCarga } from "../lib/cargaGlobal";
import { useToast } from "./Toast";

type PantallaSeleccion = "aprobar" | "revisar" | "pagar";

const PANTALLAS_SELECCION: { clave: PantallaSeleccion; etiqueta: string; detalle: string }[] = [
  { clave: "aprobar", etiqueta: "Aprobaciones", detalle: "Talento Humano · Aprobar" },
  { clave: "revisar", etiqueta: "Revisión", detalle: "Coordinación · Revisar" },
  { clave: "pagar", etiqueta: "Pagos", detalle: "Nómina · Pagar" },
];

export default function PanelParametros() {
  const toast = useToast();

  const [cargandoInicial, setCargandoInicial] = useState(true);
  const [errorInicial, setErrorInicial] = useState("");
  useReportarCarga(cargandoInicial);
  const [diasAtras, setDiasAtras] = useState("2");
  const [seleccionTotal, setSeleccionTotal] = useState<Record<PantallaSeleccion, boolean>>({ aprobar: false, revisar: false, pagar: true });
  const [guardandoSeleccion, setGuardandoSeleccion] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelado = false;
    fetch("/api/admin/parametros")
      .then(async (res) => {
        if (cancelado) return;
        if (!res.ok) {
          setErrorInicial("No se pudo cargar la información. Intenta de nuevo.");
          return;
        }
        const data = await res.json();
        setDiasAtras(String(data.diasAtrasSolicitud));
        if (data.seleccionTotal) setSeleccionTotal(data.seleccionTotal);
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

  const guardar = async () => {
    const valor = Number(diasAtras);
    if (!Number.isInteger(valor) || valor < 0 || valor > 365) {
      setError("Ingresa un número entero entre 0 y 365");
      return;
    }
    setGuardando(true);
    setError("");
    try {
      const res = await fetch("/api/admin/parametros", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ diasAtrasSolicitud: valor }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "No se pudo guardar");
        toast.error(data.error ?? "No se pudo guardar");
        return;
      }
      toast.exito("Parámetro actualizado");
    } catch {
      setError("No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.");
      toast.error("No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setGuardando(false);
    }
  };

  const guardarSeleccion = async () => {
    setGuardandoSeleccion(true);
    try {
      const res = await fetch("/api/admin/parametros", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seleccionTotal }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "No se pudo guardar");
        return;
      }
      toast.exito("Parámetro actualizado");
    } catch {
      toast.error("No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setGuardandoSeleccion(false);
    }
  };

  return (
    <div className="flex-1 px-4 sm:px-8 pb-5 space-y-4">
      {errorInicial && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{errorInicial}</div>
      )}

      {!cargandoInicial && (
        // flex-wrap (no un solo bloque a lo ancho): cada parámetro es una
        // tarjeta chica que se acomoda al lado de la siguiente — a futuro,
        // sumar otro parámetro no empieza a ocupar media pantalla cada uno.
        <div className="flex flex-wrap gap-3">
          <div className="bg-neutral-50 dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 rounded-2xl p-4 shadow-sm ring-1 ring-black/5 dark:ring-white/10 w-full sm:w-64 space-y-3">
            <div>
              <h2 className="font-semibold text-xs">Calendario de nueva solicitud</h2>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                Desde cuántos días atrás se puede elegir una fecha al registrar, crear en nombre de un colaborador, o
                copiar rutas a otro día.
              </p>
            </div>

            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                Días atrás permitidos
              </label>
              <input
                type="number"
                min={0}
                max={365}
                value={diasAtras}
                onChange={(e) => setDiasAtras(e.target.value)}
                className="mt-1 w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white px-2.5 py-2 text-sm focus:border-orange-400 focus:ring-2 focus:ring-orange-500/15 outline-none"
              />
              <p className="text-[10px] text-neutral-400 dark:text-neutral-500 mt-1">
                0 = solo hoy en adelante. Ej: 2 permite hoy, ayer y anteayer.
              </p>
            </div>

            {error && <p className="text-xs text-red-600">{error}</p>}

            <div className="flex justify-end">
              <button
                onClick={guardar}
                disabled={guardando}
                className="px-4 py-1.5 text-xs font-semibold bg-orange-500 hover:bg-orange-600 text-white rounded-lg disabled:opacity-50 transition flex items-center justify-center gap-1.5"
              >
                {guardando && <Spinner className="w-3.5 h-3.5" />}
                {guardando ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>

          <div className="bg-neutral-50 dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 rounded-2xl p-4 shadow-sm ring-1 ring-black/5 dark:ring-white/10 w-full sm:w-72 space-y-3">
            <div>
              <h2 className="font-semibold text-xs">Seleccionar todas (en bloque)</h2>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                Muestra el botón &quot;Seleccionar todas (N)&quot;, que marca todo lo filtrado (todas las páginas) para
                procesarlo en un clic. Apagado, solo se puede marcar la página visible (15 filas).
              </p>
            </div>

            <div className="space-y-2">
              {PANTALLAS_SELECCION.map(({ clave, etiqueta, detalle }) => (
                <label key={clave} className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={seleccionTotal[clave]}
                    onChange={(e) => setSeleccionTotal((prev) => ({ ...prev, [clave]: e.target.checked }))}
                    className="mt-0.5 w-4 h-4 accent-orange-500 rounded"
                  />
                  <span>
                    <span className="block text-xs font-medium">{etiqueta}</span>
                    <span className="block text-[10px] text-neutral-400 dark:text-neutral-500">{detalle}</span>
                  </span>
                </label>
              ))}
            </div>

            <div className="flex justify-end">
              <button
                onClick={guardarSeleccion}
                disabled={guardandoSeleccion}
                className="px-4 py-1.5 text-xs font-semibold bg-orange-500 hover:bg-orange-600 text-white rounded-lg disabled:opacity-50 transition flex items-center justify-center gap-1.5"
              >
                {guardandoSeleccion && <Spinner className="w-3.5 h-3.5" />}
                {guardandoSeleccion ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
