// components/Modal.tsx
// Overlay reutilizable con animación de entrada Y salida. A diferencia de
// "{abierto && <div>...}" (que desmonta de golpe apenas cambia el estado),
// este componente sigue montado un instante más para poder reproducir la
// animación de cierre antes de desaparecer del todo.

"use client";

import { useEffect, useState, type ReactNode } from "react";

const DURACION_SALIDA_MS = 180;

export default function Modal({
  abierto,
  variante = "hoja",
  className = "",
  children,
}: {
  abierto: boolean;
  // "hoja": aparece pegado abajo en móvil y centrado en desktop (formularios)
  // "centro": siempre centrado, overlay más oscuro (confirmaciones)
  variante?: "hoja" | "centro";
  className?: string;
  children: ReactNode;
}) {
  const [montado, setMontado] = useState(abierto);
  const [cerrando, setCerrando] = useState(false);

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
    >
      <div
        className={`${className} ${
          cerrando ? "animate-[panel-out_0.18s_ease-in_forwards]" : "animate-[panel-in_0.25s_cubic-bezier(0.16,1,0.3,1)]"
        }`}
      >
        {children}
      </div>
    </div>
  );
}
