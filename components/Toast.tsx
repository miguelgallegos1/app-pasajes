// components/Toast.tsx
// Notificaciones flotantes (éxito/advertencia/error) para confirmar el
// resultado de acciones como guardar, eliminar, aprobar, etc. Se
// auto-cierran solas. Colores semánticos: verde = éxito, naranja =
// advertencia, rojo = error.

"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";

type Tipo = "exito" | "advertencia" | "error";
type ToastItem = { id: number; tipo: Tipo; mensaje: string };

type ToastContextValor = {
  exito: (mensaje: string) => void;
  advertencia: (mensaje: string) => void;
  error: (mensaje: string) => void;
};

const ToastContext = createContext<ToastContextValor | null>(null);

const DURACION_MS = 4000;

const ESTILOS_TIPO: Record<Tipo, { fondo: string; anillo: string; icono: string }> = {
  exito: { fondo: "bg-green-600", anillo: "ring-green-400/30", icono: "✓" },
  advertencia: { fondo: "bg-orange-600", anillo: "ring-orange-400/30", icono: "!" },
  error: { fondo: "bg-red-600", anillo: "ring-red-400/30", icono: "!" },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

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

  const valor: ToastContextValor = {
    exito: (mensaje) => mostrar("exito", mensaje),
    advertencia: (mensaje) => mostrar("advertencia", mensaje),
    error: (mensaje) => mostrar("error", mensaje),
  };

  return (
    <ToastContext.Provider value={valor}>
      {children}
      <div className="fixed top-4 right-4 left-4 sm:left-auto z-[100] flex flex-col gap-2 sm:w-[380px]">
        {items.map((t) => {
          const estilo = ESTILOS_TIPO[t.tipo];
          return (
            <div
              key={t.id}
              role="status"
              className={`flex items-start gap-2.5 rounded-xl px-4 py-3 shadow-2xl ring-1 text-sm font-medium text-white animate-[toast-in_0.2s_ease-out] ${estilo.fondo} ${estilo.anillo}`}
            >
              <span className="mt-0.5 shrink-0">{estilo.icono}</span>
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
