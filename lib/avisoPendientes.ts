// lib/avisoPendientes.ts
// Avisa al número del menú (lib/useContadorMenu.ts) sin pasar por la red:
// - avisarCambioPendientes(): la propia acción del usuario (aprobar/
//   revisar/pagar/revertir, una o en lote) cambió su pendiente — el menú
//   vuelve a pedir el número al instante, sin esperar al sondeo.
// - publicarPendientes(href, n): la pantalla ya sabe el número exacto
//   (Registrar cuenta sus rechazadas por corregir) — el menú lo toma tal
//   cual para esa pantalla, sin ninguna consulta.

const EVENTO = "app-pasajes:pendientes-cambio";
const EVENTO_VALOR = "app-pasajes:pendientes-valor";

export function avisarCambioPendientes() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(EVENTO));
}

export function suscribirseACambioPendientes(cb: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(EVENTO, cb);
  return () => window.removeEventListener(EVENTO, cb);
}

type ValorPendientes = { href: string; total: number };

export function publicarPendientes(href: string, total: number) {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent<ValorPendientes>(EVENTO_VALOR, { detail: { href, total } }));
}

export function suscribirseAValorPendientes(cb: (valor: ValorPendientes) => void) {
  if (typeof window === "undefined") return () => {};
  const manejar = (e: Event) => cb((e as CustomEvent<ValorPendientes>).detail);
  window.addEventListener(EVENTO_VALOR, manejar);
  return () => window.removeEventListener(EVENTO_VALOR, manejar);
}
