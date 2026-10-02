// components/ModalConfirmar.tsx
// Confirmaciones de la app sobre components/Modal.tsx, para no repetir el
// mismo marcado en cada pantalla:
// - ModalConfirmar: ícono de color, pregunta, detalle opcional y los
//   botones Cancelar / acción (con spinner mientras se procesa).
// - ModalMotivo: pide un motivo escrito antes de devolver o corregir una
//   solicitud (se guarda en mayúsculas, como el resto de los textos).

"use client";

import type { ComponentType, ReactNode } from "react";
import Modal from "./Modal";
import Spinner from "./Spinner";

type Tono = "rojo" | "ambar" | "verde" | "celeste" | "naranja";

const ICONO: Record<Tono, string> = {
  rojo: "bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400",
  ambar: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  verde: "bg-green-100 text-green-600 dark:bg-green-500/15 dark:text-green-400",
  celeste: "bg-sky-100 text-sky-600 dark:bg-sky-500/15 dark:text-sky-400",
  naranja: "bg-orange-100 text-orange-600 dark:bg-orange-500/15 dark:text-orange-400",
};

const BOTON: Record<Tono, string> = {
  rojo: "bg-red-500 hover:bg-red-600",
  ambar: "bg-amber-500 hover:bg-amber-600",
  verde: "bg-green-600 hover:bg-green-700",
  celeste: "bg-sky-600 hover:bg-sky-700",
  naranja: "bg-orange-500 hover:bg-orange-600",
};

const CANCELAR =
  "px-4 py-2.5 text-sm font-medium text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition disabled:opacity-50";

type Comunes = {
  abierto: boolean;
  onCerrar: () => void;
  onConfirmar: () => void;
  procesando: boolean;
  error?: string;
  textoConfirmar: string;
  textoProcesando: string;
};

export default function ModalConfirmar({
  abierto,
  onCerrar,
  onConfirmar,
  procesando,
  error,
  textoConfirmar,
  textoProcesando,
  tono,
  icono: Icono,
  titulo,
  children,
}: Comunes & {
  tono: Tono;
  icono?: ComponentType<{ className?: string }>;
  titulo: ReactNode;
  // Detalle bajo la pregunta (total, advertencia, etc.).
  children?: ReactNode;
}) {
  return (
    <Modal abierto={abierto} onCerrar={onCerrar} onConfirmar={onConfirmar} variante="centro" className="bg-white dark:bg-neutral-900 text-black dark:text-white rounded-3xl p-7 w-full max-w-xs text-center space-y-4 shadow-2xl">
      {Icono && (
        <div className={`w-12 h-12 rounded-full ${ICONO[tono]} flex items-center justify-center mx-auto`}>
          <Icono className="w-6 h-6" />
        </div>
      )}
      <p className="font-semibold text-neutral-900 dark:text-white">{titulo}</p>
      {children}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2 justify-center pt-1">
        <button onClick={onCerrar} disabled={procesando} className={`flex-1 ${CANCELAR}`}>
          Cancelar
        </button>
        <button
          onClick={onConfirmar}
          disabled={procesando}
          className={`flex-1 px-4 py-2.5 text-sm font-semibold ${BOTON[tono]} text-white rounded-xl disabled:opacity-50 transition flex items-center justify-center gap-2`}
        >
          {procesando && <Spinner className="w-4 h-4" />}
          {procesando ? textoProcesando : textoConfirmar}
        </button>
      </div>
    </Modal>
  );
}

export function ModalMotivo({
  abierto,
  onCerrar,
  onConfirmar,
  procesando,
  error,
  textoConfirmar,
  textoProcesando,
  titulo,
  descripcion,
  motivo,
  onCambiarMotivo,
  placeholder,
}: Comunes & {
  titulo: ReactNode;
  descripcion: ReactNode;
  motivo: string;
  onCambiarMotivo: (motivo: string) => void;
  placeholder: string;
}) {
  return (
    <Modal abierto={abierto} onCerrar={onCerrar} onConfirmar={onConfirmar} variante="centro" className="bg-white dark:bg-neutral-900 text-black dark:text-white rounded-3xl p-7 w-full max-w-sm space-y-4 shadow-2xl">
      <div>
        <h2 className="font-semibold text-neutral-900 dark:text-white">{titulo}</h2>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">{descripcion}</p>
      </div>
      <textarea
        value={motivo}
        onChange={(e) => onCambiarMotivo(e.target.value.toUpperCase())}
        rows={3}
        autoFocus
        className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white px-3.5 py-3 text-sm focus:border-orange-400 focus:ring-2 focus:ring-orange-500/15 outline-none resize-none"
        placeholder={placeholder}
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2 justify-end pt-1">
        <button
          onClick={onCerrar}
          disabled={procesando}
          className="px-4 py-2.5 text-sm font-medium text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition"
        >
          Cancelar
        </button>
        <button
          onClick={onConfirmar}
          disabled={procesando}
          className="px-5 py-2.5 text-sm font-semibold bg-neutral-800 hover:bg-neutral-900 dark:bg-neutral-700 dark:hover:bg-neutral-600 text-white rounded-xl disabled:opacity-50 transition flex items-center justify-center gap-2"
        >
          {procesando && <Spinner className="w-4 h-4" />}
          {procesando ? textoProcesando : textoConfirmar}
        </button>
      </div>
    </Modal>
  );
}
