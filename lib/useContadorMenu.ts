// lib/useContadorMenu.ts
// Números pendientes del menú (reemplazan a la campanita): en qué pantalla
// va cada uno, con qué color, y cuándo se vuelven a pedir. Mismo ritmo que
// tenía la campanita, para no sumar consultas:
// - TH/Coordinación/Nómina: al entrar, al volver a la app y cada 5 min
//   (lo que hacen OTRAS personas); lo propio se refleja al instante
//   (avisarCambioPendientes en los paneles).
// - Colaborador: al entrar, al volver a la app y cuando llega un push (un
//   cambio de estado real) — nunca con sondeo.
// En Registrar la propia pantalla publica el número exacto
// (publicarPendientes), sin consulta.

"use client";

import { useEffect, useState } from "react";
import { suscribirseACambioPendientes, suscribirseAValorPendientes } from "./avisoPendientes";

export type ContadorMenu = { href: string; total: number; clase: string; texto: string };

// 5 minutos: la base (plan gratis) se duerme sola sin uso, y mantenerla
// despierta todo el día con un sondeo corto es lo que más cuesta.
const INTERVALO_SONDEO_MS = 5 * 60_000;

// Mismo color que el botón principal de cada bandeja y que el estado al
// que lleva (Aprobar ámbar, Revisar azul, Pagar verde — ver
// lib/estadosSolicitud.ts); rojo para las rechazadas por corregir.
const ESTILO_POR_HREF: Record<string, { clase: string; texto: string }> = {
  "/th/aprobaciones": { clase: "bg-amber-500 text-amber-950", texto: "por aprobar" },
  "/coordinador/revision": { clase: "bg-sky-600 text-white", texto: "por revisar" },
  "/nomina/pagos": { clase: "bg-green-600 text-white", texto: "por pagar" },
  "/th/mis-solicitudes": { clase: "bg-red-500 text-white", texto: "rechazadas por corregir" },
  "/mis-pasajes": { clase: "bg-red-500 text-white", texto: "rechazadas por corregir" },
};

const ROLES_CON_SONDEO = new Set(["ADMIN_TH", "COORDINADOR", "NOMINA"]);
const ROLES_CON_CONTADOR = new Set([...ROLES_CON_SONDEO, "COLABORADOR"]);

const PREFIJO_TITULO = /^\(\d+\+?\) /;

export function useContadorMenu(rol: string): ContadorMenu[] {
  const activo = ROLES_CON_CONTADOR.has(rol);
  const [totales, setTotales] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!activo) return;
    const conSondeo = ROLES_CON_SONDEO.has(rol);
    let cancelado = false;
    const cargar = () => {
      fetch("/api/menu/pendientes", { cache: "no-store" })
        .then((res) => (res.ok ? res.json() : null))
        .then((data: { totales: Record<string, number> } | null) => {
          if (!cancelado && data) setTotales(data.totales);
        })
        .catch(() => {});
    };
    cargar();

    const intervalo = conSondeo
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
    if (!conSondeo) navigator.serviceWorker?.addEventListener("message", alPush);
    const quitarCambio = suscribirseACambioPendientes(cargar);
    const quitarValor = suscribirseAValorPendientes(({ href, total }) =>
      setTotales((prev) => (prev[href] === total ? prev : { ...prev, [href]: total }))
    );
    return () => {
      cancelado = true;
      if (intervalo) clearInterval(intervalo);
      document.removeEventListener("visibilitychange", alVolver);
      navigator.serviceWorker?.removeEventListener("message", alPush);
      quitarCambio();
      quitarValor();
    };
  }, [activo, rol]);

  const contadores = Object.entries(totales)
    .filter(([href, total]) => total > 0 && ESTILO_POR_HREF[href])
    .map(([href, total]) => ({ href, total, ...ESTILO_POR_HREF[href] }));
  const suma = contadores.reduce((acc, c) => acc + c.total, 0);

  // Número en la pestaña del navegador: "(12) App Pasajes". Next cambia el
  // título al navegar, así que se vuelve a poner cuando lo reemplaza.
  useEffect(() => {
    if (!activo) return;
    const poner = () => {
      const base = document.title.replace(PREFIJO_TITULO, "");
      document.title = suma > 0 ? `(${suma > 99 ? "99+" : suma}) ${base}` : base;
    };
    poner();
    const observador = new MutationObserver(() => {
      if (suma > 0 ? !PREFIJO_TITULO.test(document.title) : PREFIJO_TITULO.test(document.title)) poner();
    });
    // Se observa el <head> entero: Next a veces reemplaza el <title> completo.
    observador.observe(document.head, { childList: true, characterData: true, subtree: true });
    return () => observador.disconnect();
  }, [activo, suma]);

  return contadores;
}
