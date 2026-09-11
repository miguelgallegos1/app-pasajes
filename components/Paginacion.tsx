// components/Paginacion.tsx
// Controles simples de paginación (Anterior / números / Siguiente),
// reutilizables en cualquier tabla de la app.

"use client";

export default function Paginacion({
  paginaActual,
  totalPaginas,
  onCambiarPagina,
  deshabilitado,
}: {
  paginaActual: number;
  totalPaginas: number;
  onCambiarPagina: (pagina: number) => void;
  deshabilitado?: boolean;
}) {
  if (totalPaginas <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-1.5 py-3">
      <button
        onClick={() => onCambiarPagina(paginaActual - 1)}
        disabled={paginaActual === 1 || deshabilitado}
        className="px-3 py-1.5 text-xs font-medium rounded-lg text-neutral-500 hover:bg-neutral-100 disabled:opacity-30 disabled:hover:bg-transparent transition"
      >
        ‹ Anterior
      </button>

      <span className="text-xs text-neutral-400 px-2">
        Página {paginaActual} de {totalPaginas}
      </span>

      <button
        onClick={() => onCambiarPagina(paginaActual + 1)}
        disabled={paginaActual === totalPaginas || deshabilitado}
        className="px-3 py-1.5 text-xs font-medium rounded-lg text-neutral-500 hover:bg-neutral-100 disabled:opacity-30 disabled:hover:bg-transparent transition"
      >
        Siguiente ›
      </button>
    </div>
  );
}