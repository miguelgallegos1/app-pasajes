// lib/useOrdenTabla.ts
// Orden de una tabla ya cargada en el cliente (asc/desc/original al tercer
// clic). No vuelve a pedir datos al servidor — reordena en memoria el
// array que ya se tiene, así que no afecta el rendimiento: son listas
// paginadas de a lo sumo un puñado de filas.

"use client";

import { useState, useMemo } from "react";

export type OrdenActivo<C extends string> = { campo: C; direccion: "asc" | "desc" } | null;

// clave: identifica la tabla para recordar su orden entre visitas (ej.
// "th-colaboradores"). Sin ella, el orden se resetea a como llegó del
// servidor cada vez que se navega a la pantalla, como antes.
function leerOrdenGuardado<C extends string>(clave?: string): OrdenActivo<C> {
  if (!clave || typeof window === "undefined") return null;
  try {
    const guardado = window.localStorage.getItem(`orden:${clave}`);
    return guardado ? (JSON.parse(guardado) as OrdenActivo<C>) : null;
  } catch {
    return null;
  }
}

function guardarOrden<C extends string>(clave: string | undefined, orden: OrdenActivo<C>) {
  if (!clave) return;
  try {
    if (orden) window.localStorage.setItem(`orden:${clave}`, JSON.stringify(orden));
    else window.localStorage.removeItem(`orden:${clave}`);
  } catch {
    // localStorage no disponible (privado/bloqueado): el orden igual
    // funciona para esta sesión, solo no se recuerda para la próxima.
  }
}

export function useOrdenTabla<T, C extends string>(
  items: T[],
  obtenerValor: (item: T, campo: C) => string | number,
  clave?: string
) {
  const [orden, setOrden] = useState<OrdenActivo<C>>(() => leerOrdenGuardado<C>(clave));

  const ordenar = (campo: C) => {
    setOrden((prev) => {
      const siguiente: OrdenActivo<C> =
        prev?.campo !== campo
          ? { campo, direccion: "asc" }
          : prev.direccion === "asc"
          ? { campo, direccion: "desc" }
          : null; // tercer clic: vuelve al orden con el que llegó del servidor
      guardarOrden(clave, siguiente);
      return siguiente;
    });
  };

  const itemsOrdenados = useMemo(() => {
    if (!orden) return items;
    return [...items].sort((a, b) => {
      const va = obtenerValor(a, orden.campo);
      const vb = obtenerValor(b, orden.campo);
      if (va < vb) return orden.direccion === "asc" ? -1 : 1;
      if (va > vb) return orden.direccion === "asc" ? 1 : -1;
      return 0;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, orden]);

  return { orden, ordenar, itemsOrdenados };
}
