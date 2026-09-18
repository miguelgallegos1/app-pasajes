// components/Avatar.tsx
// Avatar con iniciales y color. Dentro de una lista/tabla el color se
// asigna por POSICIÓN de la fila (indice), no por el nombre — con hash por
// nombre, dos filas visibles podían caer en el mismo color por pura
// coincidencia; por índice, ninguna fila consecutiva se repite. Sin indice
// (un avatar suelto, ej. encabezado de un modal, la barra superior) cae al
// hash por nombre de siempre.

const COLORES = [
  "bg-orange-500",
  "bg-sky-500",
  "bg-emerald-500",
  "bg-violet-500",
  "bg-rose-500",
  "bg-amber-500",
  "bg-teal-500",
  "bg-fuchsia-500",
];

export function colorPorIndice(indice: number): string {
  return COLORES[Math.abs(indice) % COLORES.length];
}

export function colorDeNombre(nombre: string): string {
  let hash = 0;
  for (let i = 0; i < nombre.length; i++) hash = nombre.charCodeAt(i) + ((hash << 5) - hash);
  return COLORES[Math.abs(hash) % COLORES.length];
}

// Mismo color para dos rutas del mismo valor — agrupa visualmente por
// precio en vez de por nombre (ver AvatarRuta).
export function colorDeValor(valor: number): string {
  return colorDeNombre(String(valor));
}

export function inicialesDeNombre(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  const primero = partes[0][0];
  const ultimo = partes.length > 1 ? partes[partes.length - 1][0] : "";
  return (primero + ultimo).toUpperCase();
}

export default function Avatar({
  nombre,
  fotoUrl,
  indice,
  className = "w-8 h-8 text-xs",
}: {
  nombre: string;
  fotoUrl?: string | null;
  // Índice de la fila dentro de la lista que se está renderizando — si se
  // pasa, el color se elige por posición en vez de por hash del nombre.
  indice?: number;
  className?: string;
}) {
  if (fotoUrl) {
    return <img src={fotoUrl} alt={nombre} className={`rounded-full object-cover shrink-0 ${className}`} />;
  }
  const color = indice !== undefined ? colorPorIndice(indice) : colorDeNombre(nombre);
  return (
    <div
      className={`rounded-full ${color} text-white font-bold flex items-center justify-center shrink-0 ${className}`}
    >
      {inicialesDeNombre(nombre)}
    </div>
  );
}
