// lib/useOrdenTabla.ts
// Orden de tablas (asc/desc/original al tercer clic), recordado entre
// visitas. Dos variantes:
// - useOrdenTabla: la tabla ya tiene TODAS las filas en el cliente; se
//   ordena el array completo en memoria y después se pagina.
// - useOrdenServidor: la tabla trae de a una página (historiales); solo
//   guarda la columna/dirección y la pantalla se la pide al servidor.

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

// Solo el estado del orden (qué columna y en qué dirección, con el mismo
// ciclo asc/desc/original y recordado entre visitas). Lo usan directo los
// historiales, que ordenan en el SERVIDOR (ver lib/ordenHistorial.ts):
// traen de a una página, así que ordenar en memoria solo reordenaba esa.
export function useOrdenServidor<C extends string>(
  clave?: string,
  direccionInicial?: Partial<Record<C, "asc" | "desc">>
) {
  const [orden, setOrden] = useState<OrdenActivo<C>>(() => leerOrdenGuardado<C>(clave));

  const ordenar = (campo: C) => {
    setOrden((prev) => {
      const inicial = direccionInicial?.[campo] ?? "asc";
      const opuesta = inicial === "asc" ? "desc" : "asc";
      const siguiente: OrdenActivo<C> =
        prev?.campo !== campo
          ? { campo, direccion: inicial }
          : prev.direccion === inicial
          ? { campo, direccion: opuesta }
          : null; // tercer clic: vuelve al orden con el que llegó del servidor
      guardarOrden(clave, siguiente);
      return siguiente;
    });
  };

  return { orden, ordenar };
}

// Agrega el orden elegido a los parámetros de la petición (`orden`/`dir`).
export function agregarOrdenAParams<C extends string>(params: URLSearchParams, orden: OrdenActivo<C>) {
  if (!orden) return;
  params.set("orden", orden.campo);
  params.set("dir", orden.direccion);
}

// Para tablas que ya tienen TODAS las filas en memoria (y paginan en el
// cliente después de ordenar): ordena el array completo.
export function useOrdenTabla<T, C extends string>(
  items: T[],
  obtenerValor: (item: T, campo: C) => string | number,
  clave?: string,
  // Con qué dirección arranca el primer clic de cada columna (por defecto
  // "asc", como siempre). Útil para columnas de monto, donde lo esperable
  // es ver primero el valor más alto en vez de tener que dar un clic extra.
  direccionInicial?: Partial<Record<C, "asc" | "desc">>
) {
  const { orden, ordenar } = useOrdenServidor<C>(clave, direccionInicial);

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
