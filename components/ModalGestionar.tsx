// components/ModalGestionar.tsx
// "Gestionar" un registro (colaborador, usuario, ruta, empresa/sitio/área):
// Desactivar o Reactivar, y Eliminar definitivamente (que pide su propia
// confirmación aparte). Mismo menú en todas las pantallas de administración.

"use client";

import type { ReactNode } from "react";
import Modal from "./Modal";

const OPCION =
  "w-full text-left px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition disabled:opacity-50";

export default function ModalGestionar({
  abierto,
  onCerrar,
  titulo,
  subtitulo,
  error,
  procesando,
  activo,
  onCambiarActivo,
  ayudaDesactivar,
  ayudaReactivar,
  onEliminar,
  ayudaEliminar,
  motivoNoEliminar,
}: {
  abierto: boolean;
  onCerrar: () => void;
  titulo: ReactNode;
  subtitulo: ReactNode;
  error?: string;
  procesando: boolean;
  // undefined: el registro no se puede desactivar (solo eliminar).
  activo?: boolean;
  onCambiarActivo?: (activo: boolean) => void;
  ayudaDesactivar?: string;
  ayudaReactivar?: string;
  onEliminar: () => void;
  ayudaEliminar: string;
  // Si viene, Eliminar queda bloqueado y se muestra este motivo.
  motivoNoEliminar?: string | null;
}) {
  return (
    <Modal abierto={abierto} onCerrar={onCerrar} variante="centro" className="bg-white dark:bg-neutral-900 text-black dark:text-white rounded-3xl p-7 w-full max-w-sm space-y-4 shadow-2xl">
      <div>
        <h2 className="font-semibold text-neutral-900 dark:text-white">{titulo}</h2>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">{subtitulo}</p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="space-y-2">
        {activo !== undefined && onCambiarActivo && (
          <button onClick={() => onCambiarActivo(!activo)} disabled={procesando} className={OPCION}>
            <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">{activo ? "Desactivar" : "Reactivar"}</p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">{activo ? ayudaDesactivar : ayudaReactivar}</p>
          </button>
        )}

        <button
          onClick={onEliminar}
          disabled={procesando || !!motivoNoEliminar}
          className="w-full text-left px-4 py-3 rounded-xl border border-red-200 dark:border-red-500/30 hover:bg-red-50 dark:hover:bg-red-500/10 transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <p className="text-sm font-medium text-red-600 dark:text-red-400">Eliminar definitivamente</p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">{motivoNoEliminar || ayudaEliminar}</p>
        </button>
      </div>

      <button
        onClick={onCerrar}
        disabled={procesando}
        className="w-full text-center text-sm font-medium text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl py-2.5 transition"
      >
        Cancelar
      </button>
    </Modal>
  );
}
