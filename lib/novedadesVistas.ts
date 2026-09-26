// lib/novedadesVistas.ts
// Qué novedades ya vio este usuario EN ESTE NAVEGADOR (localStorage), para
// que el aviso flotante aparezca una sola vez por novedad. No se guarda
// en la base a propósito: la pantalla de novedades no consume base ni
// endpoints. Si se borra el navegador o se entra desde otro equipo, el
// aviso de las novedades vigentes vuelve a aparecer una vez — aceptable
// para algo puramente informativo.

"use client";

import { useSyncExternalStore } from "react";

const CLAVE = "app-pasajes:novedades-vistas";
const EVENTO = "app-pasajes:novedades-vistas";

function leer(): string {
  try {
    return localStorage.getItem(CLAVE) ?? "";
  } catch {
    return "";
  }
}

export function marcarNovedadesVistas(ids: string[]) {
  if (ids.length === 0) return;
  try {
    const actuales = new Set(leer().split(",").filter(Boolean));
    ids.forEach((id) => actuales.add(id));
    // Se guardan solo las últimas 50: las viejas ya vencieron igual.
    localStorage.setItem(CLAVE, Array.from(actuales).slice(-50).join(","));
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
export function useNovedadesVistas(): Set<string> | null {
  const valor = useSyncExternalStore(suscribir, leer, () => null);
  return valor === null ? null : new Set(valor.split(",").filter(Boolean));
}
