// app/(app)/loading.tsx
// Se muestra al instante cuando cambian de sección (clic en el menú),
// mientras la página nueva trae sus datos. El sidebar/header vive en el
// layout y no se ve afectado por esto — solo el contenido "parpadea" con
// este spinner en vez de quedarse congelado sin ninguna señal.

import Spinner from "../../components/Spinner";

export default function Cargando() {
  return (
    <div className="flex-1 flex items-center justify-center py-24 text-neutral-400">
      <Spinner className="w-6 h-6" />
    </div>
  );
}
