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
