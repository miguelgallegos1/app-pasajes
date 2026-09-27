// lib/useContadorMenu.ts
// Número pendiente del menú (reemplaza a la campanita): en qué pantalla va,
// con qué color, y cuándo se vuelve a pedir. Mismo ritmo que tenía la
// campanita, para no sumar consultas:
// - TH/Coordinación/Nómina: al entrar, al volver a la app y cada 5 min
//   (lo que hacen OTRAS personas); lo propio se refleja al instante
//   (avisarCambioPendientes en los paneles).
// - Colaborador: al entrar, al volver a la app y cuando llega un push (un
//   cambio de estado real) — nunca con sondeo. En Registrar la propia
//   pantalla publica el número exacto (publicarPendientes), sin consulta.

"use client";

import { useEffect, useState } from "react";
import { suscribirseACambioPendientes, suscribirseAValorPendientes } from "./avisoPendientes";

export type ContadorMenu = { href: string; total: number; clase: string; texto: string };

// 5 minutos: la base (plan gratis) se duerme sola sin uso, y mantenerla
// despierta todo el día con un sondeo corto es lo que más cuesta.
const INTERVALO_SONDEO_MS = 5 * 60_000;

// Colores de cada estado (los mismos de las bandejas).
const DESTINO_POR_ROL: Record<string, { href: string; clase: string; texto: string; sondeo: boolean }> = {
  ADMIN_TH: { href: "/th/aprobaciones", clase: "bg-amber-500 text-white", texto: "por aprobar", sondeo: true },
  COORDINADOR: { href: "/coordinador/revision", clase: "bg-green-600 text-white", texto: "por revisar", sondeo: true },
  NOMINA: { href: "/nomina/pagos", clase: "bg-sky-600 text-white", texto: "por pagar", sondeo: true },
  COLABORADOR: { href: "/mis-pasajes", clase: "bg-red-500 text-white", texto: "rechazadas por corregir", sondeo: false },
};

export function useContadorMenu(rol: string): ContadorMenu | null {
  const destino = DESTINO_POR_ROL[rol];
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (!destino) return;
    let cancelado = false;
    const cargar = () => {
      fetch("/api/menu/pendientes", { cache: "no-store" })
        .then((res) => (res.ok ? res.json() : null))
        .then((data: { total: number } | null) => {
          if (!cancelado && data) setTotal(data.total);
        })
        .catch(() => {});
    };
    cargar();

    const intervalo = destino.sondeo
      ? setInterval(() => {
          if (document.visibilityState === "visible") cargar();
        }, INTERVALO_SONDEO_MS)
      : null;
    const alVolver = () => {
      if (document.visibilityState === "visible") cargar();
    };
    const alPush = (e: MessageEvent) => {
      if (e.data?.type === "push-recibido") cargar();
    };
    document.addEventListener("visibilitychange", alVolver);
    if (!destino.sondeo) navigator.serviceWorker?.addEventListener("message", alPush);
    const quitarCambio = suscribirseACambioPendientes(cargar);
    const quitarValor = suscribirseAValorPendientes((n) => setTotal(n));
    return () => {
      cancelado = true;
      if (intervalo) clearInterval(intervalo);
      document.removeEventListener("visibilitychange", alVolver);
      navigator.serviceWorker?.removeEventListener("message", alPush);
      quitarCambio();
      quitarValor();
    };
  }, [destino]);

  // Número en la pestaña del navegador: "(12) App Pasajes". Next cambia el
  // título al navegar, así que se vuelve a poner en cada cambio de ruta.
  useEffect(() => {
    if (!destino) return;
    const poner = () => {
      const base = document.title.replace(/^\(\d+\+?\) /, "");
      document.title = total > 0 ? `(${total > 99 ? "99+" : total}) ${base}` : base;
    };
    poner();
    const observador = new MutationObserver(() => {
      if (total > 0 ? !/^\(\d+\+?\) /.test(document.title) : /^\(\d+\+?\) /.test(document.title)) poner();
    });
    // Se observa el <head> entero: Next a veces reemplaza el <title> completo.
    observador.observe(document.head, { childList: true, characterData: true, subtree: true });
    return () => observador.disconnect();
  }, [destino, total]);

  return destino && total > 0 ? { href: destino.href, total, clase: destino.clase, texto: destino.texto } : null;
}
