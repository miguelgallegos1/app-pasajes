// components/Spinner.tsx
// Spinner moderno tipo "anillo con trazo" (como Vercel/Linear), reutilizable
// en cualquier botón o pantalla que necesite mostrar carga.

export default function Spinner({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none">
      {/* Pista tenue de fondo, para dar sensación de "anillo completo" */}
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" opacity="0.15" />
      {/* Trazo corto y redondeado que gira, como un "cometa" */}
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray="14 100"
      />
    </svg>
  );
}