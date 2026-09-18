// components/BotonImprimir.tsx
// Dispara el diálogo de impresión del navegador (Ctrl+P) — nada de
// librerías de PDF: la página que lo usa ya viene con su propio CSS de
// impresión (@media print) para verse bien en papel.

"use client";

import { IconoImprimir } from "./Icons";

export default function BotonImprimir({ className = "" }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className={`inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-neutral-700 dark:text-neutral-300 border border-neutral-300 dark:border-neutral-700 hover:border-orange-400 hover:text-orange-600 px-3.5 py-2.5 rounded-xl transition ${className}`}
    >
      <IconoImprimir className="w-4 h-4" /> Imprimir
    </button>
  );
}
