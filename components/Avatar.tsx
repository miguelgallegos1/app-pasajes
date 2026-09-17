// components/Avatar.tsx
// Avatar con iniciales y color determinístico (mismo nombre -> mismo color
// siempre), para identificar de un vistazo a un colaborador en listas y
// tablas sin tener que leer el nombre completo.

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

function colorDeNombre(nombre: string): string {
  let hash = 0;
  for (let i = 0; i < nombre.length; i++) hash = nombre.charCodeAt(i) + ((hash << 5) - hash);
  return COLORES[Math.abs(hash) % COLORES.length];
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
  className = "w-8 h-8 text-xs",
}: {
  nombre: string;
  fotoUrl?: string | null;
  className?: string;
}) {
  if (fotoUrl) {
    return <img src={fotoUrl} alt={nombre} className={`rounded-full object-cover shrink-0 ${className}`} />;
  }
  return (
    <div
      className={`rounded-full ${colorDeNombre(nombre)} text-white font-bold flex items-center justify-center shrink-0 ${className}`}
    >
      {inicialesDeNombre(nombre)}
    </div>
  );
}
