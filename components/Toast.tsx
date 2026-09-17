// components/Toast.tsx
// Notificaciones flotantes (éxito/advertencia/error) para confirmar el
// resultado de acciones como guardar, eliminar, aprobar, etc. Se
// auto-cierran solas. Colores semánticos: verde = éxito, naranja =
// advertencia, rojo = error.
//
// El tipo "deshacer" es distinto: la acción ya se aplicó de forma optimista
// en la pantalla (la fila ya desapareció), y este toast es la única
// oportunidad de arrepentirse. Si nadie toca "Deshacer" antes de que se
// cierre solo, recién ahí se confirma de verdad contra el servidor.

"use client";

import { createContext, useCallback, useContext, useRef, useState, type ComponentType, type ReactNode } from "react";
import { IconoCheck, IconoAlerta } from "./Icons";

type Tipo = "exito" | "advertencia" | "error";
type ToastItem =
  | { id: number; tipo: Tipo; mensaje: string }
  | { id: number; tipo: "deshacer"; mensaje: string; onDeshacer: () => void };

type ToastContextValor = {
  exito: (mensaje: string) => void;
  advertencia: (mensaje: string) => void;
  error: (mensaje: string) => void;
  // onConfirmar se dispara solo si nadie deshizo antes de que termine
  // duracionMs — ahí es cuando recién se manda el pedido real al servidor.
  deshacer: (mensaje: string, onDeshacer: () => void, onConfirmar: () => void, duracionMs?: number) => void;
};

const ToastContext = createContext<ToastContextValor | null>(null);

const DURACION_MS = 4000;
const DURACION_DESHACER_MS = 5000;

const ESTILOS_TIPO: Record<Tipo, { fondo: string; anillo: string; Icono: ComponentType<{ className?: string }> }> = {
  exito: { fondo: "bg-green-600", anillo: "ring-green-400/30", Icono: IconoCheck },
  advertencia: { fondo: "bg-orange-600", anillo: "ring-orange-400/30", Icono: IconoAlerta },
  error: { fondo: "bg-red-600", anillo: "ring-red-400/30", Icono: IconoAlerta },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const idRef = useRef(0);
  // Guarda el temporizador de cada toast con acción "Deshacer" para poder
  // cancelarlo si se hace clic a tiempo (y no confirmar dos veces).
  const timersRef = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const quitar = useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const mostrar = useCallback(
    (tipo: Tipo, mensaje: string) => {
      const id = ++idRef.current;
      setItems((prev) => [...prev, { id, tipo, mensaje }]);
      setTimeout(() => quitar(id), DURACION_MS);
    },
    [quitar]
  );

  const deshacer = useCallback(
    (mensaje: string, onDeshacer: () => void, onConfirmar: () => void, duracionMs = DURACION_DESHACER_MS) => {
      const id = ++idRef.current;
      setItems((prev) => [...prev, { id, tipo: "deshacer", mensaje, onDeshacer }]);
      const temporizador = setTimeout(() => {
        timersRef.current.delete(id);
        quitar(id);
        onConfirmar();
      }, duracionMs);
      timersRef.current.set(id, temporizador);
    },
    [quitar]
  );

  // Clic en "Deshacer": cancela el envío real y restaura.
  const alDeshacer = (t: Extract<ToastItem, { tipo: "deshacer" }>) => {
    const temporizador = timersRef.current.get(t.id);
    if (temporizador) {
      clearTimeout(temporizador);
      timersRef.current.delete(t.id);
    }
    quitar(t.id);
    t.onDeshacer();
  };

  // Clic en "×" de un toast de "Deshacer": ya no se quiere revertir, así
  // que se acepta de una — se corta la espera y se dispara ya el pedido
  // real (el temporizador ya está armado con esa misma acción).
  const alCerrarDeshacer = (t: Extract<ToastItem, { tipo: "deshacer" }>) => {
    const temporizador = timersRef.current.get(t.id);
    if (temporizador) clearTimeout(temporizador);
    timersRef.current.delete(t.id);
    quitar(t.id);
  };

  const valor: ToastContextValor = {
    exito: (mensaje) => mostrar("exito", mensaje),
    advertencia: (mensaje) => mostrar("advertencia", mensaje),
    error: (mensaje) => mostrar("error", mensaje),
    deshacer,
  };

  return (
    <ToastContext.Provider value={valor}>
      {children}
      <div className="fixed top-4 right-4 left-4 sm:left-auto z-[100] flex flex-col gap-2 sm:w-[380px]">
        {items.map((t) => {
          if (t.tipo === "deshacer") {
            return (
              <div
                key={t.id}
                role="status"
                className="flex items-center gap-3 rounded-xl px-4 py-3 shadow-2xl ring-1 ring-black/10 dark:ring-white/10 text-sm font-medium bg-neutral-900 dark:bg-neutral-800 text-white animate-[toast-in_0.2s_ease-out]"
              >
                <p className="flex-1">{t.mensaje}</p>
                <button
                  onClick={() => alDeshacer(t)}
                  className="text-orange-400 hover:text-orange-300 font-semibold transition shrink-0"
                >
                  Deshacer
                </button>
                <button
                  onClick={() => alCerrarDeshacer(t)}
                  className="text-white/50 hover:text-white transition shrink-0"
                  aria-label="Cerrar"
                >
                  ×
                </button>
              </div>
            );
          }
          const estilo = ESTILOS_TIPO[t.tipo];
          return (
            <div
              key={t.id}
              role="status"
              className={`flex items-start gap-2.5 rounded-xl px-4 py-3 shadow-2xl ring-1 text-sm font-medium text-white animate-[toast-in_0.2s_ease-out] ${estilo.fondo} ${estilo.anillo}`}
            >
              <estilo.Icono className="w-5 h-5 mt-0.5 shrink-0" />
              <p className="flex-1">{t.mensaje}</p>
              <button
                onClick={() => quitar(t.id)}
                className="text-white/60 hover:text-white transition shrink-0"
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast debe usarse dentro de ToastProvider");
  return ctx;
}
