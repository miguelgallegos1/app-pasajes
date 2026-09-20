// lib/useNavegacionFilas.ts
// Navegación con flechas arriba/abajo dentro de una tabla: solo mueve un
// resaltado visual entre filas (como en la paleta de comandos, Ctrl+K),
// Enter dispara la acción principal de la fila resaltada, Escape la
// suelta. Requiere que el contenedor de la tabla tenga el foco (se le da
// tabIndex vía contenedorRef) — así no compite con las flechas de un
// <select>/combobox ni con el scroll normal del resto de la página.

"use client";

import { useState, useRef, useCallback, type KeyboardEvent } from "react";

export function useNavegacionFilas<T>(items: T[], onEnter?: (item: T, indice: number) => void) {
  const [filaActiva, setFilaActiva] = useState<number | null>(null);
  const contenedorRef = useRef<HTMLDivElement>(null);

  const alPresionar = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setFilaActiva((i) => (i === null ? 0 : Math.min(i + 1, items.length - 1)));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setFilaActiva((i) => (i === null ? items.length - 1 : Math.max(i - 1, 0)));
      } else if (e.key === "Enter" && !e.repeat && filaActiva !== null && items[filaActiva]) {
        e.preventDefault();
        onEnter?.(items[filaActiva], filaActiva);
      } else if (e.key === "Escape") {
        setFilaActiva(null);
      }
    },
    [items, filaActiva, onEnter]
  );

  return { filaActiva, setFilaActiva, alPresionar, contenedorRef };
}
