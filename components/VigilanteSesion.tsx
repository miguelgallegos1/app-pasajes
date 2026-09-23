// components/VigilanteSesion.tsx
// Manda al login apenas vence la sesión por inactividad, en vez de dejar
// la pantalla abierta con acciones que empiezan a fallar con "No
// autorizado". Se guía por la cookie testigo (ver lib/cookieSesion.ts),
// que el navegador borra solo al vencer — revisarla no toca el servidor.

"use client";

import { useEffect } from "react";
import { COOKIE_TESTIGO_SESION } from "../lib/cookieSesion";

const INTERVALO_REVISION_MS = 15_000;

function sesionSigueActiva() {
  return document.cookie.split("; ").some((c) => c.startsWith(`${COOKIE_TESTIGO_SESION}=`));
}

export default function VigilanteSesion() {
  useEffect(() => {
    let saliendo = false;
    const revisar = async () => {
      if (saliendo || sesionSigueActiva()) return;
      saliendo = true;
      // Por si la cookie de sesión siguiera ahí sin su testigo: sin esto,
      // el login la vería válida y rebotaría de vuelta a la app.
      try {
        await fetch("/api/auth/logout", { method: "POST" });
      } catch {
        // Igual lo sacamos abajo.
      }
      // Navegación dura, igual que cerrarSesion en AppShell: el próximo
      // login arranca sin caché del cliente de la sesión vencida.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = "/login?expirada=1";
    };
    const intervalo = setInterval(revisar, INTERVALO_REVISION_MS);
    // Al volver a la pestaña (o despertar el celular) se revisa de una.
    const alVolver = () => {
      if (document.visibilityState === "visible") revisar();
    };
    document.addEventListener("visibilitychange", alVolver);
    return () => {
      clearInterval(intervalo);
      document.removeEventListener("visibilitychange", alVolver);
    };
  }, []);

  return null;
}
