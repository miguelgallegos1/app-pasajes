// components/ZonaAvisos.tsx
// Zona fija abajo al centro donde se apilan los avisos flotantes
// persistentes (solicitudes rechazadas, domicilio): cada aviso se "monta"
// ahí con <EnZonaAvisos>, así se ordenan uno sobre otro y nunca se tapan
// entre sí, en escritorio y en celular. En escritorio queda centrada sobre
// el contenido (a la derecha del menú lateral); en celular ocupa el ancho
// con margen y respeta la barra inferior del teléfono (safe-area).

"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";

const ID_ZONA = "zona-avisos";

export function ZonaAvisos() {
  return (
    <div
      id={ID_ZONA}
      className="fixed inset-x-0 bottom-0 z-40 flex flex-col-reverse items-center gap-2 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pointer-events-none md:pl-[calc(15rem+1rem)]"
    />
  );
}

const sinSuscripcion = () => () => {};

// Renderiza `children` dentro de la zona (vía portal). En el servidor y
// en el primer render no hay zona todavía: no se dibuja nada.
export function EnZonaAvisos({ children }: { children: ReactNode }) {
  const zona = useSyncExternalStore(
    sinSuscripcion,
    () => document.getElementById(ID_ZONA),
    () => null
  );
  if (!zona) return null;
  return createPortal(<div className="pointer-events-auto w-full sm:w-[420px]">{children}</div>, zona);
}
