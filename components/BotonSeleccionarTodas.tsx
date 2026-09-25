// components/BotonSeleccionarTodas.tsx
// "Seleccionar todas (N)": marca TODAS las solicitudes que cumplen los
// filtros (todas las páginas), no solo las 15 visibles. Cada pantalla lo
// muestra solo si está activado en Admin -> Parámetros.

"use client";

export default function BotonSeleccionarTodas({
  cantidad,
  todasSeleccionadas,
  onAlternar,
}: {
  cantidad: number;
  todasSeleccionadas: boolean;
  onAlternar: () => void;
}) {
  if (cantidad === 0) return null;
  return (
    <button
      onClick={onAlternar}
      title={todasSeleccionadas ? "Quitar la selección" : "Selecciona todas las que cumplen los filtros, de todas las páginas"}
      className="shrink-0 whitespace-nowrap text-xs sm:text-sm font-medium text-orange-600 dark:text-orange-400 border border-orange-500/40 hover:bg-orange-500/10 px-3 py-2 rounded-lg transition"
    >
      {todasSeleccionadas ? "Quitar selección" : `Seleccionar todas (${cantidad})`}
    </button>
  );
}
