// components/TablaEsqueleto.tsx
// Placeholder de carga con la forma de una tabla (en vez de dejar el
// espacio vacío o un spinner suelto) — CSS puro (animate-pulse de
// Tailwind), sin JS ni librerías, así que no afecta el rendimiento.

export default function TablaEsqueleto({ filas = 5, columnas = 5 }: { filas?: number; columnas?: number }) {
  return (
    <div className="bg-white dark:bg-neutral-900 rounded-2xl overflow-hidden shadow-sm ring-1 ring-black/5 dark:ring-white/10 animate-pulse">
      {Array.from({ length: filas }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 sm:gap-6 px-4 py-4 border-t border-neutral-100 dark:border-neutral-800 first:border-t-0"
        >
          {Array.from({ length: columnas }).map((_, j) => (
            <div
              key={j}
              className="h-3 rounded-full bg-neutral-200 dark:bg-neutral-800"
              style={{ width: j === 0 ? "12%" : `${100 / columnas}%` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
