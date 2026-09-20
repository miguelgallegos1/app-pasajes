// lib/accionesHeader.tsx
// Permite que cualquier Panel "publique" su botón principal (ej. "+ Nueva
// ruta") para que aparezca en la misma fila que el título/breadcrumb
// (Breadcrumbs.tsx), en vez de en una fila propia debajo — así se ve igual
// tengan o no botón, sin que cada pantalla tenga que reconstruir ese
// layout por su cuenta. AppShell.tsx provee el contexto una sola vez.

"use client";

import { createContext, useContext, useEffect, type ReactNode } from "react";

export const AccionesHeaderContext = createContext<((nodo: ReactNode) => void) | null>(null);

// Cada Panel llama esto con su botón (o null si no aplica). Se limpia solo
// al desmontarse/cambiar, así no queda pegado el botón de la pantalla
// anterior al navegar.
export function useAccionesHeader(nodo: ReactNode) {
  const setAcciones = useContext(AccionesHeaderContext);
  useEffect(() => {
    setAcciones?.(nodo);
    return () => setAcciones?.(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodo]);
}
