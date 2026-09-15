// lib/rutas.ts
// Qué rutas puede ver/usar un colaborador puntual: si tiene rutas marcadas
// como exclusivas para él, ve SOLO esas (así lo anuncia el panel de TH:
// "si no elegís ninguna, sigue viendo todas las rutas del área"). Si no
// tiene ninguna exclusiva, ve todas las generales del área (colaboradorExclusivoId
// null). Se reutiliza en mis-pasajes, en el selector de rutas del supervisor
// y en la validación de solicitudes, para que no se desincronicen entre sí.

import { db } from "./db";

export async function condicionRutasVisibles(colaborador: { sitioId: string; areaId: string; id: string }) {
  const tieneExclusivas = await db.ruta.count({
    where: { colaboradorExclusivoId: colaborador.id },
  });

  return {
    sitioId: colaborador.sitioId,
    areaId: colaborador.areaId,
    activo: true,
    colaboradorExclusivoId: tieneExclusivas > 0 ? colaborador.id : null,
  };
}
