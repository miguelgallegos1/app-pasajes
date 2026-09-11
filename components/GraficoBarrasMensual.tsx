// components/GraficoBarrasMensual.tsx
// Barras apiladas comparando los últimos meses por estado. SVG propio
// (sin librería externa), con leyenda siempre visible y tooltip al pasar
// el mouse/enfocar cada mes. Colores validados con el script de
// accesibilidad del skill de dataviz (ver referencia de la paleta).

"use client";

import { useEffect, useRef, useState } from "react";

export type FilaMes = {
  mes: string;
  etiqueta: string;
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

const W = 640;
const H = 220;
const PAD_IZQ = 34;
const PAD_DER = 8;
const PAD_ARRIBA = 12;
const PAD_ABAJO = 26;
const ANCHO_PLOT = W - PAD_IZQ - PAD_DER;
const ALTO_PLOT = H - PAD_ARRIBA - PAD_ABAJO;
const BASE_Y = PAD_ARRIBA + ALTO_PLOT;

function techoAgradable(valor: number): number {
  if (valor <= 0) return 1;
  const magnitud = Math.pow(10, Math.floor(Math.log10(valor)));
  const normalizado = valor / magnitud;
  const techo = normalizado <= 1 ? 1 : normalizado <= 2 ? 2 : normalizado <= 5 ? 5 : 10;
  return techo * magnitud;
}

// Rectángulo con esquinas superiores redondeadas y base cuadrada — para
// el segmento más alto (no vacío) de cada barra apilada.
function pathTopeRedondeado(x: number, y: number, ancho: number, alto: number, radio: number): string {
  const r = Math.min(radio, ancho / 2, Math.max(alto, 0));
  if (alto <= 0) return "";
  return `M${x},${y + alto} L${x},${y + r} Q${x},${y} ${x + r},${y} L${x + ancho - r},${y} Q${x + ancho},${y} ${x + ancho},${y + r} L${x + ancho},${y + alto} Z`;
}

export default function GraficoBarrasMensual({ datos }: { datos: FilaMes[] }) {
  const contenedorRef = useRef<HTMLDivElement>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [posTooltip, setPosTooltip] = useState({ x: 0, y: 0 });

  // Las barras crecen desde la base al montar, en vez de aparecer de
  // golpe: arranca en 0 y pasa a 1 un instante después para que la
  // transición CSS tenga algo que animar. Para que la animación se
  // repita con datos nuevos (ej. al presionar "Actualizar"), el padre le
  // pasa un `key` distinto por cada búsqueda — eso fuerza un montaje
  // nuevo, que es lo que de verdad reinicia el estado (no reasignarlo
  // "a mano" dentro del efecto).
  const [montado, setMontado] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMontado(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const total = (fila: FilaMes) => fila.pendientes + fila.aprobadas + fila.revisadas + fila.pagadas;
  const maxTotal = Math.max(...datos.map(total), 1);
  const techo = techoAgradable(maxTotal);

  const n = Math.max(datos.length, 1);
  const anchoSlot = ANCHO_PLOT / n;
  const anchoBarra = Math.min(24, anchoSlot * 0.5);

  const moverTooltip = (e: React.MouseEvent, idx: number) => {
    const cont = contenedorRef.current;
    if (!cont) return;
    const rect = cont.getBoundingClientRect();
    setHoverIdx(idx);
    setPosTooltip({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  return (
    <div ref={contenedorRef} className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Solicitudes por mes, por estado">
        {/* Líneas de referencia (0, mitad, techo) */}
        {[0, 0.5, 1].map((frac) => {
          const y = BASE_Y - frac * ALTO_PLOT;
          const valor = Math.round(techo * frac);
          return (
            <g key={frac}>
              <line x1={PAD_IZQ} y1={y} x2={W - PAD_DER} y2={y} stroke="#e1e0d9" strokeWidth={1} />
              <text x={PAD_IZQ - 6} y={y + 3} textAnchor="end" fontSize="9" fill="#898781">
                {valor.toLocaleString("es-EC")}
              </text>
            </g>
          );
        })}
        <line x1={PAD_IZQ} y1={BASE_Y} x2={W - PAD_DER} y2={BASE_Y} stroke="#c3c2b7" strokeWidth={1} />

        {datos.map((fila, idx) => {
          const xSlot = PAD_IZQ + idx * anchoSlot;
          const xBarra = xSlot + anchoSlot / 2 - anchoBarra / 2;
          const valores = [fila.pendientes, fila.aprobadas, fila.revisadas, fila.pagadas];
          const ultimoNoVacio = valores.reduce((acc, v, i) => (v > 0 ? i : acc), -1);

          let acumulado = 0;
          const segmentos = valores.map((valor, i) => {
            const altoSeg = (valor / techo) * ALTO_PLOT;
            const y = BASE_Y - acumulado - altoSeg;
            acumulado += altoSeg;
            return { i, valor, y, altoSeg };
          });

          return (
            <g key={fila.mes}>
              <rect
                x={xSlot}
                y={PAD_ARRIBA}
                width={anchoSlot}
                height={ALTO_PLOT}
                fill="#e1e0d9"
                opacity={hoverIdx === idx ? 0.5 : 0}
                style={{ transition: "opacity 0.15s ease" }}
              />
              <g
                style={{
                  transform: montado ? "scaleY(1)" : "scaleY(0)",
                  transformOrigin: `${xSlot + anchoSlot / 2}px ${BASE_Y}px`,
                  transformBox: "view-box",
                  transition: `transform 0.6s cubic-bezier(0.22,1,0.36,1) ${idx * 55}ms`,
                }}
              >
                {segmentos.map(({ i, valor, y, altoSeg }) => {
                  if (valor <= 0) return null;
                  const esTope = i === ultimoNoVacio;
                  const gap = altoSeg > 3 ? 1 : 0;
                  if (esTope) {
                    return (
                      <path
                        key={i}
                        d={pathTopeRedondeado(xBarra, y + gap, anchoBarra, altoSeg - gap, 4)}
                        fill={SERIES[i].color}
                      />
                    );
                  }
                  return (
                    <rect
                      key={i}
                      x={xBarra}
                      y={y + gap}
                      width={anchoBarra}
                      height={Math.max(altoSeg - gap * 2, 0)}
                      fill={SERIES[i].color}
                    />
                  );
                })}
              </g>
              {/* Área invisible de hover, más grande que la barra */}
              <rect
                x={xSlot}
                y={PAD_ARRIBA}
                width={anchoSlot}
                height={ALTO_PLOT}
                fill="transparent"
                tabIndex={0}
                role="button"
                aria-label={`${fila.etiqueta}: ${fila.pendientes} pendientes, ${fila.aprobadas} aprobadas, ${fila.revisadas} revisadas, ${fila.pagadas} pagadas`}
                onMouseMove={(e) => moverTooltip(e, idx)}
                onMouseEnter={(e) => moverTooltip(e, idx)}
                onMouseLeave={() => setHoverIdx(null)}
                onFocus={() => setHoverIdx(idx)}
                onBlur={() => setHoverIdx(null)}
                style={{ outline: "none", cursor: "pointer" }}
              />
              <text x={xSlot + anchoSlot / 2} y={H - 8} textAnchor="middle" fontSize="10" fill="#898781">
                {fila.etiqueta.split(" ")[0]}
              </text>
            </g>
          );
        })}
      </svg>

      {hoverIdx !== null && datos[hoverIdx] && (
        <div
          className="absolute z-10 pointer-events-none bg-neutral-900 text-white text-xs rounded-lg shadow-xl px-3 py-2 space-y-1 min-w-[150px]"
          style={{ left: Math.min(posTooltip.x + 10, W - 160), top: Math.max(posTooltip.y - 90, 0) }}
        >
          <p className="font-semibold text-[11px] text-neutral-300">{datos[hoverIdx].etiqueta}</p>
          {SERIES.map((s) => (
            <div key={s.clave} className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
              <span className="font-semibold">{datos[hoverIdx][s.clave]}</span>
              <span className="text-neutral-400">{s.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Leyenda — siempre visible con 4 series */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-2 justify-center">
        {SERIES.map((s) => (
          <div key={s.clave} className="flex items-center gap-1.5 text-xs text-neutral-600">
            <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: s.color }} />
            {s.label}
          </div>
        ))}
      </div>
    </div>
  );
}
