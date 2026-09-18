// lib/rutas.ts
// Qué rutas puede ver/usar un colaborador puntual: SOLO las que TH le
// asignó explícitamente en "Asignar rutas" (colaboradoresExclusivos).
// Si no tiene ninguna asignada, no ve ninguna — ya no hay una lista
// "general" de respaldo. Una ruta puede ser exclusiva de más de un
// colaborador a la vez (ej. viven en el mismo sector). Se reutiliza en
// mis-pasajes, en el selector de rutas del supervisor y en la validación
// de solicitudes, para que no se desincronicen entre sí.

export function condicionRutasVisibles(colaborador: { sitioId: string; areaId: string; id: string }) {
  return {
    sitioId: colaborador.sitioId,
    areaId: colaborador.areaId,
    activo: true,
    colaboradoresExclusivos: { some: { id: colaborador.id } },
  };
}
