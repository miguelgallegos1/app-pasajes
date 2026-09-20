// components/Breadcrumbs.tsx
// "Dónde estamos": GRUPO / PANTALLA / descripción, pegado justo arriba del
// contenido de cada pantalla. Reemplaza el <h1> + subtítulo que antes vivía
// repetido dentro de cada Panel — el texto (label, grupo, descripcion) sale
// de UN solo lugar (el registro del menú en AppShell.tsx), así que agregar
// o cambiar una pantalla no implica tocar nada acá. El margen negativo
// descuenta exactamente el padding-top que ya trae el contenedor de la
// página (py-5 en todos los paneles), así que ocupa el mismo espacio de
// siempre en vez de agregar una fila nueva.

"use client";

import { usePathname } from "next/navigation";
import type { ItemPaleta } from "./CommandPalette";

export default function Breadcrumbs({ items }: { items: ItemPaleta[] }) {
  const pathname = usePathname();

  const actual = items.find((i) => i.href === pathname);
  if (!actual) return null;

  return (
    <p className="px-4 sm:px-8 pt-3 mb-[-20px] relative text-xs sm:text-sm">
      {actual.grupo && (
        <>
          <span className="font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500">{actual.grupo}</span>
          <span className="mx-1.5 text-neutral-300 dark:text-neutral-700">/</span>
        </>
      )}
      <span className="font-semibold uppercase tracking-wide text-neutral-700 dark:text-neutral-200">{actual.label}</span>
      {actual.descripcion && (
        <>
          <span className="hidden sm:inline mx-1.5 text-neutral-300 dark:text-neutral-700">/</span>
          <span className="hidden sm:inline text-neutral-400 dark:text-neutral-500">{actual.descripcion}</span>
        </>
      )}
    </p>
  );
}
