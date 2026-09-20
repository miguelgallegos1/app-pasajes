// lib/avisoPendientes.ts
// Avisa a la campanita de TH/Coordinación/Nómina (NotificacionesMenu.tsx)
// que la propia acción del usuario (aprobar/revisar/pagar/revertir, una
// o en lote) puede haber cambiado su propio contador de pendientes — sin
// esto, tenía que esperar al próximo sondeo (hasta 5 minutos) para verlo
// reflejado, aunque la respuesta ya estaba en la misma pestaña. Es un
// evento del navegador (sin red ni base de por medio), así que no cuesta
// nada usarlo también para la campanita del rol que hizo la acción.

const EVENTO = "app-pasajes:pendientes-cambio";

export function avisarCambioPendientes() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(EVENTO));
}

export function suscribirseACambioPendientes(cb: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(EVENTO, cb);
  return () => window.removeEventListener(EVENTO, cb);
}
