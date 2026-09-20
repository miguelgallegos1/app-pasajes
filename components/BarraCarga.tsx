// components/BarraCarga.tsx
// Misma franja naranja de app/(app)/loading.tsx, como componente
// reutilizable: loading.tsx la muestra sola (vía Suspense) mientras el
// SERVIDOR prepara la pantalla nueva, pero desaparece apenas esa pantalla
// monta — justo cuando empieza a pedir sus propios datos al cliente (el
// patrón de "cáscara liviana" de toda la app). Si esa pantalla no pinta
// nada en ese instante, el usuario ve la barra cortarse de golpe y
// aparecer un spinner gris aparte, dos estilos distintos para lo que en
// realidad es UNA sola espera continua.
//
// Usando este mismo componente en el primer render de cada pantalla
// (cargandoInicial === true desde el arranque) el corte desaparece: React
// reemplaza el fallback de Suspense por el contenido real en el mismo
// commit, y ese contenido ya es esta misma barra, en la misma posición
// (fixed, no depende de dónde vive en el árbol) — se ve como una sola
// franja continua durante toda la carga, no dos.

export default function BarraCarga() {
  return (
    <div className="fixed top-14 md:top-16 left-0 md:left-60 right-0 z-20 h-[3px] overflow-hidden bg-orange-500/10">
      <span className="absolute top-0 h-full bg-orange-500 rounded-full animate-[barra-carga-1_2.1s_cubic-bezier(0.65,0.815,0.735,0.395)_infinite]" />
      <span className="absolute top-0 h-full bg-orange-500 rounded-full animate-[barra-carga-2_2.1s_cubic-bezier(0.165,0.84,0.44,1)_infinite] [animation-delay:1.15s]" />
    </div>
  );
}
