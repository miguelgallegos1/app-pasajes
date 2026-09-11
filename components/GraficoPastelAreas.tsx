// components/GraficoPastelAreas.tsx
// Dona (pie con hueco) del gasto por Área. SVG propio, sin librería
// externa. "Otras" (si aparece) siempre se pinta en gris neutro, nunca
// con un color categórico nuevo — así nunca compite visualmente con una
// área real. Colores validados con el script de accesibilidad del skill
// de dataviz.

"use client";

import { useEffect, useRef, useState } from "react";

const COLORES_AREA = ["#e87ba4", "#008300", "#4a3aa7", "#e34948"];
const COLOR_OTRAS = "#898781";

const CX = 100;
const CY = 100;
const R_EXTERNO = 78;
const R_INTERNO = 48;
const PAD_ANGULO = 0.025;

function colorDe(area: string, idx: number): string {
  return area === "Otras" ? COLOR_OTRAS : COLORES_AREA[idx % COLORES_AREA.length];
}

function puntoEnCirculo(radio: number, angulo: number) {
  return { x: CX + radio * Math.cos(angulo), y: CY + radio * Math.sin(angulo) };
}

function pathDona(startAngle: number, endAngle: number): string {
  const rOut = R_EXTERNO;
  const rIn = R_INTERNO;
  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
  const p1 = puntoEnCirculo(rOut, startAngle);
  const p2 = puntoEnCirculo(rOut, endAngle);
  const p3 = puntoEnCirculo(rIn, endAngle);
  const p4 = puntoEnCirculo(rIn, startAngle);
  return `M${p1.x},${p1.y} A${rOut},${rOut} 0 ${largeArc} 1 ${p2.x},${p2.y} L${p3.x},${p3.y} A${rIn},${rIn} 0 ${largeArc} 0 ${p4.x},${p4.y} Z`;
}

export default function GraficoPastelAreas({ datos }: { datos: { area: string; total: number }[] }) {
  const contenedorRef = useRef<HTMLDivElement>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [posTooltip, setPosTooltip] = useState({ x: 0, y: 0 });

  // Entrada suave (escala + desvanecido) al montar, en vez de aparecer de
  // golpe. El padre le pasa un `key` distinto por cada búsqueda para que
  // esto se repita con datos nuevos (ver GraficoBarrasMensual.tsx).
  const [montado, setMontado] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMontado(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const totalGeneral = datos.reduce((acc, d) => acc + d.total, 0) || 1;

  // Suma acumulada calculada de forma inmutable (sin mutar una variable
  // externa entre iteraciones): con 5 porciones como mucho, el costo
  // extra de recalcular el prefijo en cada vuelta es insignificante.
  const cunas = datos.map((d, idx) => {
    const previoFraccion = datos.slice(0, idx).reduce((acc, x) => acc + x.total, 0) / totalGeneral;
    const fraccion = d.total / totalGeneral;
    const start = -Math.PI / 2 + previoFraccion * 2 * Math.PI + PAD_ANGULO / 2;
    const end = -Math.PI / 2 + (previoFraccion + fraccion) * 2 * Math.PI - PAD_ANGULO / 2;
    return { ...d, idx, start: Math.min(start, end), end: Math.max(start, end), fraccion };
  });

  const mover = (e: React.MouseEvent, idx: number) => {
    const cont = contenedorRef.current;
    if (!cont) return;
    const rect = cont.getBoundingClientRect();
    setHoverIdx(idx);
    setPosTooltip({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  if (datos.length === 0 || totalGeneral === 0) {
    return <p className="text-sm text-neutral-400 py-8 text-center">Sin datos en este rango</p>;
  }

  return (
    <div ref={contenedorRef} className="relative flex flex-col sm:flex-row items-center gap-4">
      <svg viewBox="0 0 200 200" className="w-44 h-44 shrink-0" role="img" aria-label="Gasto por área">
        <g
          style={{
            transform: montado ? "scale(1)" : "scale(0.85)",
            opacity: montado ? 1 : 0,
            transformOrigin: `${CX}px ${CY}px`,
            transformBox: "view-box",
            transition: "transform 0.45s cubic-bezier(0.22,1,0.36,1), opacity 0.35s ease",
          }}
        >
          {cunas.map((c) => (
            <path
              key={c.area}
              d={pathDona(c.start, c.end)}
              fill={colorDe(c.area, c.idx)}
              tabIndex={0}
              role="button"
              aria-label={`${c.area}: $${c.total.toFixed(2)}, ${(c.fraccion * 100).toFixed(0)}%`}
              onMouseMove={(e) => mover(e, c.idx)}
              onMouseEnter={(e) => mover(e, c.idx)}
              onMouseLeave={() => setHoverIdx(null)}
              onFocus={() => setHoverIdx(c.idx)}
              onBlur={() => setHoverIdx(null)}
              style={{
                transform: hoverIdx === c.idx ? "scale(1.045)" : "scale(1)",
                transformOrigin: `${CX}px ${CY}px`,
                transformBox: "view-box",
                transition: "transform 0.15s ease",
                outline: "none",
                cursor: "pointer",
              }}
            />
          ))}
        </g>
        <text x={CX} y={CY - 4} textAnchor="middle" fontSize="11" fill="#898781">
          Total
        </text>
        <text x={CX} y={CY + 12} textAnchor="middle" fontSize="14" fontWeight="700" fill="#0b0b0b">
          ${totalGeneral >= 1000 ? `${(totalGeneral / 1000).toFixed(1)}K` : totalGeneral.toFixed(0)}
        </text>
      </svg>

      {/* Leyenda — siempre visible con 2+ series */}
      <div className="flex-1 w-full space-y-1.5">
        {cunas.map((c) => (
          <div key={c.area} className="flex items-center justify-between gap-2 text-sm">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: colorDe(c.area, c.idx) }} />
              <span className="truncate text-neutral-700">{c.area}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0 text-neutral-500">
              <span className="font-semibold text-neutral-800">${c.total.toFixed(2)}</span>
              <span className="text-xs">{(c.fraccion * 100).toFixed(0)}%</span>
            </div>
          </div>
        ))}
      </div>

      {hoverIdx !== null && cunas[hoverIdx] && (
        <div
          className="absolute z-10 pointer-events-none bg-neutral-900 text-white text-xs rounded-lg shadow-xl px-3 py-2 space-y-0.5"
          style={{ left: Math.min(posTooltip.x + 10, 300), top: Math.max(posTooltip.y - 50, 0) }}
        >
          <p className="font-semibold text-[11px] text-neutral-300">{cunas[hoverIdx].area}</p>
          <p>
            <span className="font-semibold">${cunas[hoverIdx].total.toFixed(2)}</span>{" "}
            <span className="text-neutral-400">({(cunas[hoverIdx].fraccion * 100).toFixed(0)}%)</span>
          </p>
        </div>
      )}
    </div>
  );
}
