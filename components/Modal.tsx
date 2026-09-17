// components/Modal.tsx
// Overlay reutilizable con animación de entrada Y salida. A diferencia de
// "{abierto && <div>...}" (que desmonta de golpe apenas cambia el estado),
// este componente sigue montado un instante más para poder reproducir la
// animación de cierre antes de desaparecer del todo.

"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

const DURACION_SALIDA_MS = 180;

export default function Modal({
  abierto,
  variante = "hoja",
  className = "",
  onCerrar,
  children,
}: {
  abierto: boolean;
  // "hoja": aparece pegado abajo en móvil y centrado en desktop (formularios)
  // "centro": siempre centrado, overlay más oscuro (confirmaciones)
  variante?: "hoja" | "centro";
  className?: string;
  // Opcional para no romper algún uso que ya maneje su propio cierre, pero
  // sin ella el modal no se puede cerrar con Escape ni tocando afuera —
  // pasarla siempre que exista un botón "Cancelar" equivalente.
  onCerrar?: () => void;
  children: ReactNode;
}) {
  const [montado, setMontado] = useState(abierto);
  const [cerrando, setCerrando] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const elementoPrevioRef = useRef<HTMLElement | null>(null);
  // Guardamos la última onCerrar en un ref: si dependiera del valor directo
  // en el efecto de abajo, cada re-render del padre (p. ej. al escribir en un
  // input del formulario) pasaría una función inline nueva y el efecto se
  // reiniciaría en cada tecla, devolviendo el foco al panel y "robándoselo"
  // al input activo.
  const onCerrarRef = useRef(onCerrar);
  useEffect(() => {
    onCerrarRef.current = onCerrar;
  }, [onCerrar]);

  useEffect(() => {
    if (abierto) {
      setMontado(true);
      setCerrando(false);
      return;
    }
    if (!montado) return;
    setCerrando(true);
    const temporizador = setTimeout(() => {
      setMontado(false);
      setCerrando(false);
    }, DURACION_SALIDA_MS);
    return () => clearTimeout(temporizador);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto]);

  // Accesibilidad: foco al diálogo al abrir (para que el lector de
  // pantalla anuncie su contenido), Escape para cerrar, y foco de vuelta
  // en lo que lo abrió al cerrarse — todo opcional vía onCerrar.
  useEffect(() => {
    if (!abierto) return;
    elementoPrevioRef.current = document.activeElement as HTMLElement | null;
    const id = setTimeout(() => panelRef.current?.focus(), 10);
    const alPresionar = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCerrarRef.current?.();
    };
    window.addEventListener("keydown", alPresionar);
    return () => {
      clearTimeout(id);
      window.removeEventListener("keydown", alPresionar);
      elementoPrevioRef.current?.focus?.();
    };
  }, [abierto]);

  if (!montado) return null;

  const overlayBase =
    variante === "centro"
      ? "bg-black/80 flex items-center justify-center z-[60] p-4"
      : "bg-black/70 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4";

  return (
    <div
      className={`fixed inset-0 ${overlayBase} ${cerrando ? "pointer-events-none" : ""} ${
        cerrando ? "animate-[overlay-out_0.18s_ease-in_forwards]" : "animate-[overlay-in_0.2s_ease-out]"
      }`}
      onClick={() => onCerrar?.()}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className={`outline-none ${className} ${
          cerrando ? "animate-[panel-out_0.18s_ease-in_forwards]" : "animate-[panel-in_0.25s_cubic-bezier(0.16,1,0.3,1)]"
        }`}
      >
        {children}
      </div>
    </div>
  );
}
