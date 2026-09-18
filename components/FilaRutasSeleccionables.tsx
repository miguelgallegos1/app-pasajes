// components/FilaRutasSeleccionables.tsx
// Lista de rutas con checkbox + observación opcional por ruta marcada. La
// observación es una pestaña plegable de verdad (chevron que gira, como el
// acordeón de colaboradores): colapsada no queda nada del input a la
// vista, solo el chevron (con un punto si ya tiene texto guardado) — un
// clic ahí abre el panel debajo, y solo uno a la vez queda abierto.
// Compartido entre "Nueva solicitud" (PanelColaborador, con o sin equipo)
// y "Crear solicitud" de TH (PanelSolicitudesTH) — misma lógica, un solo
// lugar en vez de mantenerla duplicada en cada pantalla.

import { formatearMoneda } from "../lib/formato";
import { IconoChevron } from "./Icons";

export type RutaSimple = { id: string; valor: number; label: string };

export default function FilaRutasSeleccionables({
  rutas,
  elegidas,
  onAlternarRuta,
  observaciones,
  onCambiarObservacion,
  claveItem,
  colaboradorId,
  observacionAbiertaClave,
  onAlternarObservacion,
  indentado = false,
}: {
  rutas: RutaSimple[];
  elegidas: string[];
  onAlternarRuta: (rutaId: string) => void;
  observaciones: Record<string, string>;
  onCambiarObservacion: (rutaId: string, valor: string) => void;
  claveItem: (colaboradorId: string, rutaId: string) => string;
  colaboradorId: string;
  observacionAbiertaClave: string | null;
  onAlternarObservacion: (clave: string) => void;
  indentado?: boolean;
}) {
  if (rutas.length === 0) {
    return <p className="px-3.5 py-4 text-xs text-neutral-400 dark:text-neutral-500 text-center">Sin rutas asignadas</p>;
  }
  return (
    <>
      {rutas.map((r) => {
        const marcada = elegidas.includes(r.id);
        const clave = claveItem(colaboradorId, r.id);
        const valorObservacion = observaciones[clave] ?? "";
        const observacionAbierta = observacionAbiertaClave === clave;
        return (
          <div key={r.id} className={marcada ? "bg-orange-50/60 dark:bg-orange-500/5" : ""}>
            <div className={`flex items-center gap-3 py-2.5 text-sm ${indentado ? "pl-9 pr-3.5" : "px-3.5"}`}>
              <label className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer">
                <input
                  type="checkbox"
                  checked={marcada}
                  onChange={() => onAlternarRuta(r.id)}
                  className="w-4 h-4 accent-orange-500 rounded shrink-0"
                />
                <span className="flex-1 min-w-0 truncate text-neutral-800 dark:text-neutral-200">{r.label}</span>
              </label>
              <span className="text-neutral-400 dark:text-neutral-500 text-xs shrink-0">{formatearMoneda(r.valor)}</span>
              {marcada && (
                <button
                  type="button"
                  onClick={() => onAlternarObservacion(clave)}
                  title="Observación para esta ruta"
                  className="flex items-center gap-1 p-1 -mr-1 rounded-lg text-neutral-400 dark:text-neutral-500 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-500/10 transition shrink-0"
                >
                  {valorObservacion && <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0" />}
                  <IconoChevron className={`w-3.5 h-3.5 transition-transform ${observacionAbierta ? "rotate-90" : ""}`} />
                </button>
              )}
            </div>
            {marcada && observacionAbierta && (
              <div className={`pb-2.5 ${indentado ? "pl-9 pr-3.5" : "px-3.5"}`}>
                <input
                  autoFocus
                  value={valorObservacion}
                  onChange={(e) => onCambiarObservacion(r.id, e.target.value.toUpperCase())}
                  placeholder="Observación para esta ruta (opcional)"
                  className="w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 px-2.5 py-1.5 text-xs focus:border-orange-400 focus:ring-2 focus:ring-orange-500/15 outline-none"
                />
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}
