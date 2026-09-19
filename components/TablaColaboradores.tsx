// components/TablaColaboradores.tsx
// Lista "Por colaborador": una fila por colaborador (nombre, cantidad de
// rutas, total). Colapsada por defecto — el detalle (código/fecha/ruta/
// valor) solo se pide y se muestra si el usuario expande con el chevron.
// El encabezado ("Colaborador" / "Total") va UNA sola vez arriba de toda
// la lista, no se repite al expandir — el detalle de cada colaborador se
// muestra indentado (en cascada) bajo su fila, sin encabezado propio.
// Si hay selección, cada colaborador tiene su propio checkbox (selecciona
// todas sus solicitudes de una vez, sin necesidad de expandir) más un
// "Seleccionar todos" en el encabezado, para actuar en lote sin revisar
// solicitud por solicitud.

"use client";

import { useRef, useState, useMemo, useEffect } from "react";
import { formatearMoneda } from "../lib/formato";
import { IconoChevron } from "./Icons";
import EstadoVacio from "./EstadoVacio";
import Avatar from "./Avatar";
import Spinner from "./Spinner";
import Paginacion from "./Paginacion";

export type FilaColaborador = { id: string; nombre: string; cantidad: number; total: number };

export type ColumnaItem<T> = {
  encabezado: string;
  render: (item: T) => React.ReactNode;
  className?: string;
};

type Seleccion = {
  seleccionadas: Set<string>;
  // Selecciona/deselecciona UNA solicitud puntual (fila del detalle
  // expandido).
  alternar: (id: string) => void;
  // IDs de TODAS las solicitudes de ese colaborador — permite marcar
  // "seleccionar todo este colaborador" (o "seleccionar todos" en el
  // encabezado) sin tener que abrir ni pedir nada al backend.
  idsDe: (colaboradorId: string) => string[];
  // Si ya están todas seleccionadas, las quita; si no, las selecciona todas.
  alternarGrupo: (ids: string[]) => void;
};

type Props<T> = {
  filas: FilaColaborador[];
  cargarItems: (colaboradorId: string) => Promise<T[]> | T[];
  clave: (item: T) => string;
  columnas: ColumnaItem<T>[];
  acciones?: (item: T) => React.ReactNode;
  seleccion?: Seleccion;
  vacio?: string;
  vacioItems?: string;
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

export default function TablaColaboradores<T>({
  filas,
  cargarItems,
  clave,
  columnas,
  acciones,
  seleccion,
  vacio = "Sin resultados",
  vacioItems = "Sin solicitudes",
  porPagina,
}: Props<T>) {
  const [pagina, setPagina] = useState(1);
  const totalPaginas = porPagina ? Math.max(1, Math.ceil(filas.length / porPagina)) : 1;
  const paginaSegura = Math.min(pagina, totalPaginas);
  const filasPagina = useMemo(
    () => (porPagina ? filas.slice((paginaSegura - 1) * porPagina, paginaSegura * porPagina) : filas),
    [filas, porPagina, paginaSegura]
  );

  const [abierto, setAbierto] = useState<string | null>(null);
  const [items, setItems] = useState<T[]>([]);
  const [cargando, setCargando] = useState(false);
  const peticionRef = useRef(0);

  const alternarExpandido = async (colaboradorId: string) => {
    if (abierto === colaboradorId) {
      setAbierto(null);
      return;
    }
    setAbierto(colaboradorId);
    const idPeticion = ++peticionRef.current;
    setCargando(true);
    try {
      const resultado = await cargarItems(colaboradorId);
      if (idPeticion !== peticionRef.current) return; // llegó una más nueva antes
      setItems(resultado);
    } finally {
      if (idPeticion === peticionRef.current) setCargando(false);
    }
  };

  const cambiarPagina = (p: number) => {
    setPagina(p);
    setAbierto(null);
  };

  const totalGeneral = useMemo(() => filas.reduce((acc, c) => acc + c.total, 0), [filas]);

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
      <div className="flex items-center gap-3 px-4 py-3 bg-neutral-100/70 dark:bg-neutral-800/40 border-b border-neutral-200/70 dark:border-neutral-800/70 text-xs font-medium text-neutral-500 dark:text-neutral-400">
        {seleccion ? (
          <CheckboxColaborador
            ids={idsPagina}
            seleccionadas={seleccion.seleccionadas}
            onToggle={() => seleccion.alternarGrupo(idsPagina)}
          />
        ) : (
          <span className="w-4 shrink-0" />
        )}
        <span className="w-3.5 shrink-0" />
        <span className="w-8 shrink-0" />
        <span className="flex-1">Colaborador</span>
        <span className="shrink-0">Total</span>
      </div>

      <div className="divide-y divide-neutral-200/70 dark:divide-neutral-800/70">
        {filasPagina.map((colaborador, i) => {
          const expandido = abierto === colaborador.id;
          const idsColaborador = seleccion ? seleccion.idsDe(colaborador.id) : [];
          return (
            <div key={colaborador.id}>
              <div className="flex items-center gap-3 px-4 py-3">
                {seleccion && (
                  <CheckboxColaborador
                    ids={idsColaborador}
                    seleccionadas={seleccion.seleccionadas}
                    onToggle={() => seleccion.alternarGrupo(idsColaborador)}
                  />
                )}
                <button
                  type="button"
                  onClick={() => alternarExpandido(colaborador.id)}
                  className="flex-1 flex items-center gap-3 min-w-0 text-left"
                >
                  <IconoChevron
                    className={`w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500 shrink-0 transition-transform ${expandido ? "rotate-90" : ""}`}
                  />
                  <Avatar nombre={colaborador.nombre} indice={i} className="w-8 h-8 text-xs shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-neutral-900 dark:text-white truncate">{colaborador.nombre}</p>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                      {colaborador.cantidad} {colaborador.cantidad === 1 ? "ruta" : "rutas"}
                    </p>
                  </div>
                  <span className="text-xs text-neutral-700 dark:text-neutral-300 shrink-0">
                    {formatearMoneda(colaborador.total)}
                  </span>
                </button>
              </div>

              {expandido && (
                <div className="border-t border-neutral-200/70 dark:border-neutral-800/70 bg-neutral-50/60 dark:bg-neutral-800/20">
                  {cargando ? (
                    <div className="flex items-center gap-2 px-4 py-4 text-xs text-neutral-400 dark:text-neutral-500">
                      <Spinner className="w-4 h-4" /> Cargando...
                    </div>
                  ) : items.length === 0 ? (
                    <p className="px-4 py-4 text-xs text-neutral-400 dark:text-neutral-500">{vacioItems}</p>
                  ) : (
                    <div className="overflow-x-auto pl-8 sm:pl-11">
                      <table className="w-full text-xs min-w-[560px]">
                        <tbody>
                          {items.map((item) => {
                            const id = clave(item);
                            return (
                              <tr
                                key={id}
                                className="border-t border-neutral-200/70 dark:border-neutral-800/70 hover:bg-neutral-100/60 dark:hover:bg-neutral-800/60 transition"
                              >
                                {seleccion && (
                                  <td className="px-4 py-2 w-10">
                                    <input
                                      type="checkbox"
                                      checked={seleccion.seleccionadas.has(id)}
                                      onChange={() => seleccion.alternar(id)}
                                      className="w-4 h-4 accent-orange-500 rounded"
                                    />
                                  </td>
                                )}
                                {columnas.map((col) => (
                                  <td key={col.encabezado} className={`px-4 py-2 ${col.className ?? ""}`}>
                                    {col.render(item)}
                                  </td>
                                ))}
                                {acciones && (
                                  <td className="px-4 py-2 w-px">
                                    <div className="flex justify-end">{acciones(item)}</div>
                                  </td>
                                )}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-neutral-100/70 dark:bg-neutral-800/60 border-t border-neutral-200 dark:border-neutral-800 text-xs font-semibold text-neutral-800 dark:text-neutral-200">
        <span>
          Total general ({filas.length} {filas.length === 1 ? "colaborador" : "colaboradores"})
        </span>
        <span>{formatearMoneda(totalGeneral)}</span>
      </div>

      {porPagina && <Paginacion paginaActual={paginaSegura} totalPaginas={totalPaginas} onCambiarPagina={cambiarPagina} />}
    </div>
  );
}
