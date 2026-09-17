// components/Breadcrumbs.tsx
// Etiqueta de sección ("Talento Humano") pegada justo arriba del título de
// cada pantalla — no repite el nombre de la pantalla (eso ya lo dice el
// propio título, un breadcrumb completo ahí era redundante) y no suma una
// fila aparte: el margen negativo descuenta exactamente el padding-top que
// ya trae el contenedor de la página (py-5 en todos los paneles), así que
// ocupa el mismo espacio de siempre en vez de agregar uno nuevo.

"use client";

import { usePathname } from "next/navigation";
import type { ItemPaleta } from "./CommandPalette";

export default function Breadcrumbs({ items }: { items: ItemPaleta[] }) {
  const pathname = usePathname();

  const actual = items.find((i) => i.href === pathname);
  if (!actual?.grupo) return null;

  return (
    <p className="px-4 sm:px-8 pt-3 mb-[-20px] relative text-[11px] font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
      {actual.grupo}
    </p>
  );
}
