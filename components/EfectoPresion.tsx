// components/EfectoPresion.tsx
// Dispara la animación de presión (ver app/globals.css, clase
// ".presionando" + @keyframes presion-onda) una sola vez por click/tap,
// sin importar cuánto dure el click — a diferencia de :active (que solo
// dura lo que el botón está físicamente apretado y por eso en un click
// rápido se veía cortada a mitad de camino), esto deja que la animación
// siempre corra completa. Un solo listener delegado en document cubre
// los 200+ botones/links/[role=button] existentes, sin tocarlos uno por
// uno ni agregar un listener por elemento.

"use client";

import { useEffect } from "react";

const SELECTOR = 'button:not(:disabled), a[class], [role="button"]';
const CLASE = "presionando";

export default function EfectoPresion() {
  useEffect(() => {
    const alPresionar = (e: PointerEvent) => {
      const el = (e.target as Element)?.closest?.(SELECTOR) as HTMLElement | null;
      if (!el) return;
      // Reflow forzado: si el click anterior todavía tenía la clase (caso
      // de clicks muy seguidos), quitarla y volver a agregarla en el mismo
      // tick no reinicia la animación — el navegador la ve como "ya
      // estaba puesta" y no la retoma desde 0%.
      el.classList.remove(CLASE);
      void el.offsetWidth;
      el.classList.add(CLASE);
    };
    const alTerminar = (e: AnimationEvent) => {
      if (e.animationName === "presion-onda") {
        (e.target as HTMLElement).classList.remove(CLASE);
      }
    };
    document.addEventListener("pointerdown", alPresionar, { passive: true });
    document.addEventListener("animationend", alTerminar);
    return () => {
      document.removeEventListener("pointerdown", alPresionar);
      document.removeEventListener("animationend", alTerminar);
    };
  }, []);

  return null;
}
