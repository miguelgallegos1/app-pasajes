// components/Breadcrumbs.tsx
// Título de la pantalla + su descripción ("Revisión · Solicitudes
// aprobadas listas para revisar"), pegado arriba del contenido, con el
// botón principal de la pantalla (si tiene, ej. "+ Nueva ruta") a la
// derecha en la misma fila — así se ve igual tengan o no botón. El texto
// (label, descripcion) sale de UN solo lugar: el registro del menú en
// AppShell.tsx. El botón lo publica cada Panel vía useAccionesHeader (ver
// lib/accionesHeader.tsx), en vez de armar su propia fila de header.
//
// Maneja su propio espaciado (pt-5, como antes tenía cada Panel) — los
// paneles ya no traen padding-top propio (pb-5 en vez de py-5), para que
// la distancia sea siempre la misma sin importar qué venga primero en
// cada pantalla.

"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import type { ItemPaleta } from "./CommandPalette";

export default function Breadcrumbs({ items, acciones }: { items: ItemPaleta[]; acciones?: ReactNode }) {
  const pathname = usePathname();

  const actual = items.find((i) => i.href === pathname);
  if (!actual) return null;

  return (
    <div className="px-4 sm:px-8 pt-5 pb-4 flex flex-wrap items-center justify-between gap-2">
      <div className="flex flex-wrap items-baseline gap-2">
        <h1 className="text-lg sm:text-xl font-bold">{actual.label}</h1>
        {actual.descripcion && (
          <span className="hidden sm:inline text-xs text-neutral-500 dark:text-neutral-400">· {actual.descripcion}</span>
        )}
      </div>
      {acciones && <div className="flex items-center gap-2 shrink-0">{acciones}</div>}
    </div>
  );
}
