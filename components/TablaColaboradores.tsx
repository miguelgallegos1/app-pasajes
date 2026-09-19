// components/TablaColaboradores.tsx
// Lista "Por colaborador": una fila por colaborador (nombre, cantidad de
// rutas, total) — sin desglose ni detalle, porque eso ya está disponible
// en la vista "lista" (código/fecha/ruta/valor). Esta vista existe para
// una sola cosa: encontrar rápido a alguien y, si hay selección, marcar
// su grupo entero (o "Seleccionar todos") de un clic para actuar en lote
// sin tener que revisar solicitud por solicitud.

"use client";

import { useRef, useState, useMemo, useEffect } from "react";
import { formatearMoneda } from "../lib/formato";
import EstadoVacio from "./EstadoVacio";
import Avatar from "./Avatar";
import Paginacion from "./Paginacion";

export type FilaColaborador = { id: string; nombre: string; cantidad: number; total: number };

type Seleccion = {
  seleccionadas: Set<string>;
  // IDs de TODAS las solicitudes de ese colaborador — permite marcar
  // "seleccionar todo este colaborador" (o "seleccionar todos" en el
  // encabezado) sin tener que abrir ni pedir nada al backend.
  idsDe: (colaboradorId: string) => string[];
  // Si ya están todas seleccionadas, las quita; si no, las selecciona todas.
  alternarGrupo: (ids: string[]) => void;
};

type Props = {
  filas: FilaColaborador[];
  seleccion?: Seleccion;
  vacio?: string;
  // Paginación interna (client-side). Se omite en los historiales, que ya
  // paginan del lado del servidor.
  porPagina?: number;
};

function CheckboxColaborador({
  ids,
  seleccionadas,
  onToggle,
}: {
  ids: string[];
  seleccionadas: Set<string>;
  onToggle: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const todos = ids.length > 0 && ids.every((id) => seleccionadas.has(id));
  const alguno = ids.some((id) => seleccionadas.has(id));

  useEffect(() => {
    if (ref.current) ref.current.indeterminate = alguno && !todos;
  }, [alguno, todos]);

  return (
    <input
      ref={ref}
      type="checkbox"
      checked={todos}
      disabled={ids.length === 0}
      onChange={onToggle}
      className="w-4 h-4 accent-orange-500 rounded shrink-0 disabled:opacity-30"
    />
  );
}

export default function TablaColaboradores({ filas, seleccion, vacio = "Sin resultados", porPagina }: Props) {
  const [pagina, setPagina] = useState(1);
  const totalPaginas = porPagina ? Math.max(1, Math.ceil(filas.length / porPagina)) : 1;
  const paginaSegura = Math.min(pagina, totalPaginas);
  const filasPagina = useMemo(
    () => (porPagina ? filas.slice((paginaSegura - 1) * porPagina, paginaSegura * porPagina) : filas),
    [filas, porPagina, paginaSegura]
  );

  if (filas.length === 0) {
    return (
      <div className="px-4 py-10">
        <EstadoVacio mensaje={vacio} />
      </div>
    );
  }

  const idsPagina = seleccion ? filasPagina.flatMap((c) => seleccion.idsDe(c.id)) : [];

  return (
    <div>
      {seleccion && (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-neutral-100/70 dark:bg-neutral-800/40 border-b border-neutral-200/70 dark:border-neutral-800/70">
          <CheckboxColaborador
            ids={idsPagina}
            seleccionadas={seleccion.seleccionadas}
            onToggle={() => seleccion.alternarGrupo(idsPagina)}
          />
          <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Seleccionar todos</span>
        </div>
      )}

      <div className="divide-y divide-neutral-200/70 dark:divide-neutral-800/70">
        {filasPagina.map((colaborador, i) => {
          const idsColaborador = seleccion ? seleccion.idsDe(colaborador.id) : [];
          return (
            <div key={colaborador.id} className="flex items-center gap-3 px-4 py-3.5">
              {seleccion && (
                <CheckboxColaborador
                  ids={idsColaborador}
                  seleccionadas={seleccion.seleccionadas}
                  onToggle={() => seleccion.alternarGrupo(idsColaborador)}
                />
              )}
              <Avatar nombre={colaborador.nombre} indice={i} className="w-9 h-9 text-xs shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-neutral-900 dark:text-white truncate">{colaborador.nombre}</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  {colaborador.cantidad} {colaborador.cantidad === 1 ? "ruta" : "rutas"}
                </p>
              </div>
              <span className="font-semibold text-neutral-800 dark:text-neutral-200 shrink-0">
                {formatearMoneda(colaborador.total)}
              </span>
            </div>
          );
        })}
      </div>

      {porPagina && <Paginacion paginaActual={paginaSegura} totalPaginas={totalPaginas} onCambiarPagina={setPagina} />}
    </div>
  );
}
