// lib/rutas.ts
// Qué rutas puede ver/usar un colaborador puntual: las de toda su área
// (colaboradorExclusivoId es null) más las que se le asignaron a él en
// particular. Se reutiliza en mis-pasajes, en el selector de rutas del
// supervisor y en la validación de solicitudes, para que las 4 no se
// desincronicen entre sí.

export function condicionRutasVisibles(colaborador: { sitioId: string; areaId: string; id: string }) {
  return {
    sitioId: colaborador.sitioId,
    areaId: colaborador.areaId,
    activo: true,
    OR: [{ colaboradorExclusivoId: null }, { colaboradorExclusivoId: colaborador.id }],
  };
}
