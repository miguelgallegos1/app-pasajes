// app/(app)/loading.tsx
// Se muestra al instante cuando cambian de sección (clic en el menú),
// mientras la página nueva trae sus datos. El sidebar/header vive en el
// layout y no se ve afectado por esto — solo el contenido se reemplaza
// por estos puntos centrados en vez de quedarse congelado sin ninguna señal.

export default function Cargando() {
  return (
    <div className="flex-1 min-h-[60vh] flex items-center justify-center">
      <div className="flex gap-2">
        <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-[dot-pulse_1s_ease-in-out_infinite]" />
        <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-[dot-pulse_1s_ease-in-out_infinite] [animation-delay:0.15s]" />
        <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-[dot-pulse_1s_ease-in-out_infinite] [animation-delay:0.3s]" />
      </div>
    </div>
  );
}
