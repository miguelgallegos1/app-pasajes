// components/TopColaboradores.tsx
// Ranking de los 20 colaboradores con más valor en pasajes en los últimos
// 6 meses (mismo rango y mismos estados que GraficoBarrasMensual). Cada
// fila lleva una barra horizontal proporcional al valor, apilada por
// estado con los mismos colores del gráfico, y un tooltip con el desglose.

"use client";

import { useEffect, useRef, useState } from "react";
import { formatearMoneda } from "../lib/formato";

export type FilaTopColaborador = {
  id: string;
  nombre: string;
  codigoNomina: string | null;
  cantidad: number;
  total: number;
  pendientes: number;
  aprobadas: number;
  revisadas: number;
  pagadas: number;
};

const SERIES = [
  { clave: "pendientes", label: "Pendientes", color: "#eda100" },
  { clave: "aprobadas", label: "Aprobadas", color: "#1baf7a" },
  { clave: "revisadas", label: "Revisadas", color: "#2a78d6" },
  { clave: "pagadas", label: "Pagadas", color: "#eb6834" },
] as const;

// Medalla para los 3 primeros; el resto lleva el puesto en gris.
const MEDALLAS = [
  "bg-gradient-to-br from-amber-300 to-amber-500 text-amber-950 shadow-amber-500/40",
  "bg-gradient-to-br from-slate-200 to-slate-400 text-slate-900 shadow-slate-400/40",
  "bg-gradient-to-br from-orange-300 to-orange-600 text-orange-950 shadow-orange-600/40",
];

export default function TopColaboradores({ datos }: { datos: FilaTopColaborador[] }) {
  const contenedorRef = useRef<HTMLDivElement>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [posTooltip, setPosTooltip] = useState({ x: 0, y: 0 });
  const [anchoContenedor, setAnchoContenedor] = useState(600);

  // Las barras crecen desde la izquierda al montar (el padre le pasa un
  // `key` por búsqueda para repetirlo, igual que en los otros gráficos).
  const [montado, setMontado] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMontado(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const mover = (e: React.MouseEvent, idx: number) => {
    const cont = contenedorRef.current;
    if (!cont) return;
    const rect = cont.getBoundingClientRect();
    setHoverIdx(idx);
    setAnchoContenedor(rect.width);
    setPosTooltip({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  if (datos.length === 0) {
    return <p className="text-sm text-neutral-400 dark:text-neutral-500 py-8 text-center">Sin resultados para ese rango</p>;
  }

  const maximo = Math.max(...datos.map((d) => d.total), 1);

  return (
    <div ref={contenedorRef} className="relative">
      <ol className="grid grid-cols-1 xl:grid-cols-2 gap-x-8 gap-y-1">
        {datos.map((d, idx) => (
          <li
            key={d.id}
            tabIndex={0}
            aria-label={`Puesto ${idx + 1}: ${d.nombre}, ${formatearMoneda(d.total)} en ${d.cantidad} solicitudes`}
            onMouseMove={(e) => mover(e, idx)}
            onMouseEnter={(e) => mover(e, idx)}
            onMouseLeave={() => setHoverIdx(null)}
            onFocus={() => setHoverIdx(idx)}
            onBlur={() => setHoverIdx(null)}
            onClick={(e) => (hoverIdx === idx ? setHoverIdx(null) : mover(e, idx))}
            className={`flex items-center gap-3 rounded-xl px-2 py-2 outline-none cursor-pointer transition-colors ${
              hoverIdx === idx ? "bg-orange-50 dark:bg-white/5" : ""
            }`}
          >
            <span
              className={`w-7 h-7 rounded-full grid place-items-center text-xs font-bold shrink-0 ${
                idx < 3 ? `${MEDALLAS[idx]} shadow-md` : "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400"
              }`}
            >
              {idx + 1}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-sm font-medium text-neutral-800 dark:text-neutral-100 truncate">{d.nombre}</p>
                <p className="text-sm font-bold text-neutral-900 dark:text-white tabular-nums shrink-0">{formatearMoneda(d.total)}</p>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 h-2 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                  <div
                    className="h-full flex gap-px rounded-full overflow-hidden"
                    style={{
                      width: montado ? `${(d.total / maximo) * 100}%` : "0%",
                      transition: `width 0.7s cubic-bezier(0.22,1,0.36,1) ${idx * 30}ms`,
                    }}
                  >
                    {SERIES.map((s) =>
                      d[s.clave] > 0 ? (
                        <span key={s.clave} style={{ flexGrow: d[s.clave], backgroundColor: s.color }} />
                      ) : null
                    )}
                  </div>
                </div>
                <span className="text-[11px] text-neutral-400 dark:text-neutral-500 tabular-nums shrink-0 w-16 text-right">
                  {d.cantidad} {d.cantidad === 1 ? "pasaje" : "pasajes"}
                </span>
              </div>
            </div>
          </li>
        ))}
      </ol>

      {hoverIdx !== null && datos[hoverIdx] && (
        <div
          className="absolute z-10 pointer-events-none bg-white/95 backdrop-blur text-neutral-900 dark:bg-neutral-900/95 dark:text-white text-xs rounded-xl shadow-xl ring-1 ring-black/5 dark:ring-white/10 px-3 py-2.5 space-y-1 w-[220px]"
          style={{
            left: Math.max(8, Math.min(posTooltip.x + 12, anchoContenedor - 228)),
            top: posTooltip.y + 16,
          }}
        >
          <div className="pb-1 mb-1 border-b border-neutral-100 dark:border-white/10">
            <p className="font-semibold truncate">{datos[hoverIdx].nombre}</p>
            {datos[hoverIdx].codigoNomina && (
              <p className="text-[11px] text-neutral-400 dark:text-neutral-500">Código {datos[hoverIdx].codigoNomina}</p>
            )}
          </div>
          {SERIES.map((s) => (
            <div key={s.clave} className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
              <span className="text-neutral-500 dark:text-neutral-400 flex-1">{s.label}</span>
              <span className="font-semibold tabular-nums">{formatearMoneda(datos[hoverIdx][s.clave])}</span>
            </div>
          ))}
          <p className="pt-1 text-[11px] text-neutral-400 dark:text-neutral-500">
            {datos[hoverIdx].cantidad} solicitudes · {formatearMoneda(datos[hoverIdx].total)}
          </p>
        </div>
      )}

      {/* Leyenda — mismos colores que el gráfico mensual */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-4 justify-center">
        {SERIES.map((s) => (
          <div key={s.clave} className="flex items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-300">
            <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: s.color }} />
            {s.label}
          </div>
        ))}
      </div>
    </div>
  );
}
