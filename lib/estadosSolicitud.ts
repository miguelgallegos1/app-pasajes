// lib/estadosSolicitud.ts
// Descripción de cada estado del flujo de una solicitud, para mostrar
// como tooltip sobre el badge de color — el color ya distingue el estado
// a simple vista, pero no explica en qué paso del flujo está ni qué sigue.

export const DESCRIPCION_ESTADO: Record<string, string> = {
  PENDIENTE: "Esperando aprobación de Talento Humano",
  APROBADA: "Aprobada por Talento Humano, esperando revisión de Coordinación",
  RECHAZADA: "Rechazada por Talento Humano — el colaborador puede corregirla y reenviarla",
  REVISADO: "Revisada por Coordinación, esperando el pago de Nómina",
  PAGADA: "Pagada — proceso completo",
};

// Clases de color del badge de estado — antes redefinido (con distintos
// subconjuntos de estados) en cada pantalla de historial que muestra esta
// columna. Un solo mapa con los 5 estados cubre a todas por igual.
export const ESTILOS_ESTADO: Record<string, string> = {
  PENDIENTE: "bg-amber-100 text-amber-800",
  APROBADA: "bg-green-100 text-green-800",
  RECHAZADA: "bg-red-100 text-red-800",
  REVISADO: "bg-sky-100 text-sky-800",
  PAGADA: "bg-orange-100 text-orange-800",
};
