// components/AccionesSalida.tsx
// Botones de "salida" de los historiales (Exportar a Excel, Imprimir)
// agrupados en un solo bloque compacto a la derecha de la barra: en
// escritorio con ícono + texto, en celular solo el ícono (el nombre queda
// en el tooltip y para lectores de pantalla), así no se amontonan.

import type { ReactElement, ReactNode } from "react";

// Misma altura que el resto de controles de la barra (fechas, Filtros, Buscar).
const BASE = "inline-flex items-center justify-center gap-1.5 h-[42px] px-3 sm:px-3.5 text-xs font-semibold transition";

export function GrupoSalidas({ children }: { children: ReactNode }) {
  return (
    <div className="inline-flex shrink-0 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 divide-x divide-neutral-300 dark:divide-neutral-700 overflow-hidden">
      {children}
    </div>
  );
}

export function BotonSalida({
  href,
  icono: Icono,
  etiqueta,
  titulo,
  deshabilitado,
  nuevaPestana,
}: {
  href: string;
  icono: (props: { className?: string }) => ReactElement;
  etiqueta: string;
  titulo?: string;
  deshabilitado?: boolean;
  nuevaPestana?: boolean;
}) {
  if (deshabilitado) {
    return (
      <span aria-disabled="true" aria-label={etiqueta} title={titulo ?? etiqueta} className={`${BASE} text-neutral-300 dark:text-neutral-600 cursor-not-allowed`}>
        <Icono className="w-4 h-4" />
        <span className="hidden sm:inline">{etiqueta}</span>
      </span>
    );
  }
  return (
    <a
      href={href}
      aria-label={etiqueta}
      title={titulo ?? etiqueta}
      {...(nuevaPestana ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className={`${BASE} text-neutral-700 dark:text-neutral-200 hover:bg-orange-50 hover:text-orange-600 dark:hover:bg-orange-500/10 dark:hover:text-orange-400`}
    >
      <Icono className="w-4 h-4" />
      <span className="hidden sm:inline">{etiqueta}</span>
    </a>
  );
}
