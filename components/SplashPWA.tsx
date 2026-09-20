"use client";

// components/SplashPWA.tsx
// Pantalla de carga que se ve al abrir la app instalada (PWA), mientras
// React todavía no terminó de montar el resto de la página. A diferencia
// de la versión anterior (un <script> que sacaba este nodo del DOM a mano
// con el.remove()), acá el desmontado lo hace React mismo vía estado: sacar
// un nodo del DOM "por fuera" de React rompe su reconciliación interna la
// próxima vez que necesita tocar ese mismo árbol (errores tipo
// "insertBefore/removeChild: node is not a child of this node").

import { useEffect, useState } from "react";
import Spinner from "./Spinner";
import { APP_NOMBRE } from "../lib/config";

export default function SplashPWA() {
  const [visible, setVisible] = useState(true);
  const [montado, setMontado] = useState(true);

  useEffect(() => {
    const minimo = new Promise<void>((resolve) => setTimeout(resolve, 350));
    const cargada =
      document.readyState === "complete"
        ? Promise.resolve()
        : new Promise<void>((resolve) => window.addEventListener("load", () => resolve(), { once: true }));

    let temporizador: ReturnType<typeof setTimeout>;
    Promise.all([minimo, cargada]).then(() => {
      setVisible(false);
      temporizador = setTimeout(() => setMontado(false), 300);
    });

    return () => clearTimeout(temporizador);
  }, []);

  if (!montado) return null;

  return (
    <div
      id="app-splash"
      className="fixed inset-0 z-[9999] flex-col items-center justify-center gap-4 bg-white"
      style={{ transition: "opacity .3s ease", opacity: visible ? 1 : 0 }}
    >
      {/* <img>, no <Image>: /pwa-icon-512.png tiene su propio Cache-Control
          largo en next.config.ts — next/image la serviría por su propio
          optimizador, sin ese header. También se pinta antes de que React
          termine de hidratar (ver comentario arriba), momento en que
          next/image todavía no puede intervenir igual. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/pwa-icon-512.png" alt="" width={88} height={88} />
      <div className="flex flex-col items-center gap-3">
        <p className="text-lg font-bold text-neutral-800 tracking-tight">{APP_NOMBRE}</p>
        <Spinner className="w-5 h-5 text-orange-500" />
      </div>
    </div>
  );
}
