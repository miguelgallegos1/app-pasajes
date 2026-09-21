// lib/parametros.ts
// Parámetros globales editables desde Admin -> Parámetros. Viven en una
// única fila (id fijo "global", ver schema.prisma) que se crea recién con
// el primer guardado — hasta entonces, se usa el valor por defecto.

import { db } from "./db";
import { DIAS_ATRAS_SOLICITUD_DEFECTO } from "./config";

const ID_PARAMETRO_GLOBAL = "global";

export async function obtenerDiasAtrasSolicitud(): Promise<number> {
  const parametro = await db.parametro.findUnique({ where: { id: ID_PARAMETRO_GLOBAL } });
  return parametro?.diasAtrasSolicitud ?? DIAS_ATRAS_SOLICITUD_DEFECTO;
}

export async function actualizarDiasAtrasSolicitud(valor: number): Promise<void> {
  await db.parametro.upsert({
    where: { id: ID_PARAMETRO_GLOBAL },
    create: { id: ID_PARAMETRO_GLOBAL, diasAtrasSolicitud: valor },
    update: { diasAtrasSolicitud: valor },
  });
}
