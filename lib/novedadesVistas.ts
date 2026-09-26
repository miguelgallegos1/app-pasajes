// lib/novedadesVistas.ts
// Qué novedades ya vio cada usuario EN ESTE NAVEGADOR (localStorage), para
// que el aviso flotante aparezca una sola vez por novedad. La clave lleva
// el id del usuario: si varias personas comparten un equipo, cada una ve
// su propio aviso (guardado solo por navegador, quien entraba después ya
// no lo veía). No se guarda en la base a propósito: las novedades no
// consumen base ni endpoints. Si se borra el navegador o se entra desde
// otro equipo, el aviso de las vigentes vuelve a aparecer una vez —
// aceptable para algo puramente informativo.

"use client";

import { useSyncExternalStore } from "react";

const EVENTO = "app-pasajes:novedades-vistas";

function clave(usuarioId: string): string {
  return `app-pasajes:novedades-vistas:${usuarioId}`;
}

function leer(usuarioId: string): string {
  try {
    return localStorage.getItem(clave(usuarioId)) ?? "";
  } catch {
    return "";
  }
}

export function marcarNovedadesVistas(usuarioId: string, ids: string[]) {
  if (ids.length === 0) return;
  try {
    const actuales = new Set(leer(usuarioId).split(",").filter(Boolean));
    ids.forEach((id) => actuales.add(id));
    // Se guardan solo las últimas 50: las viejas ya vencieron igual.
    localStorage.setItem(clave(usuarioId), Array.from(actuales).slice(-50).join(","));
  } catch {
    // Sin localStorage (privado/bloqueado): el aviso solo se cierra por
    // esta visita, no rompe nada.
  }
  window.dispatchEvent(new Event(EVENTO));
}

function suscribir(avisar: () => void) {
  window.addEventListener(EVENTO, avisar);
  window.addEventListener("storage", avisar); // otras pestañas
  return () => {
    window.removeEventListener(EVENTO, avisar);
    window.removeEventListener("storage", avisar);
  };
}

// null en el servidor / primer render: así el aviso nunca se dibuja en el
// HTML del servidor (no sabe qué vio el usuario) y no hay diferencias al
// hidratar.
export function useNovedadesVistas(usuarioId: string): Set<string> | null {
  const valor = useSyncExternalStore(suscribir, () => leer(usuarioId), () => null);
  return valor === null ? null : new Set(valor.split(",").filter(Boolean));
}
