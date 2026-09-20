// app/(app)/loading.tsx
// Se muestra al instante cuando cambian de sección (clic en el menú),
// mientras el SERVIDOR prepara la página nueva — Next.js lo pone y lo
// saca solo, vía Suspense, sin JS de nuestro lado. Apenas esa página
// monta, sigue exactamente la misma barra (ver components/BarraCarga.tsx)
// pero pintada por la propia pantalla mientras pide sus datos al
// cliente — así se ve como una sola franja continua, sin corte.

import BarraCarga from "../../components/BarraCarga";

export default function Cargando() {
  return <BarraCarga />;
}
