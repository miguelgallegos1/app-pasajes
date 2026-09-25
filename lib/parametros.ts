// lib/parametros.ts
// Parámetros globales editables desde Admin -> Parámetros. Viven en una
// única fila (id fijo "global", ver schema.prisma) que se crea recién con
// el primer guardado — hasta entonces, se usa el valor por defecto.

import { db } from "./db";
import { DIAS_ATRAS_SOLICITUD_DEFECTO } from "./config";

const ID_PARAMETRO_GLOBAL = "global";

export async function obtenerDiasAtrasSolicitud(): Promise<number> {
  const parametro = await db.parametro.findUnique({
    where: { id: ID_PARAMETRO_GLOBAL },
    select: { diasAtrasSolicitud: true },
  });
  return parametro?.diasAtrasSolicitud ?? DIAS_ATRAS_SOLICITUD_DEFECTO;
}

export async function actualizarDiasAtrasSolicitud(valor: number): Promise<void> {
  await db.parametro.upsert({
    where: { id: ID_PARAMETRO_GLOBAL },
    create: { id: ID_PARAMETRO_GLOBAL, diasAtrasSolicitud: valor },
    update: { diasAtrasSolicitud: valor },
  });
}

// Botón "Seleccionar todas (N)" por pantalla (ver schema.prisma). Los
// valores por defecto coinciden con los @default del esquema, para cuando
// la fila "global" todavía no existe.
export type PantallaSeleccionTotal = "aprobar" | "revisar" | "pagar";
export type SeleccionTotal = Record<PantallaSeleccionTotal, boolean>;

export const SELECCION_TOTAL_DEFECTO: SeleccionTotal = { aprobar: false, revisar: false, pagar: true };

export async function obtenerSeleccionTotal(): Promise<SeleccionTotal> {
  const p = await db.parametro.findUnique({
    where: { id: ID_PARAMETRO_GLOBAL },
    select: { seleccionTotalAprobar: true, seleccionTotalRevisar: true, seleccionTotalPagar: true },
  });
  if (!p) return SELECCION_TOTAL_DEFECTO;
  return { aprobar: p.seleccionTotalAprobar, revisar: p.seleccionTotalRevisar, pagar: p.seleccionTotalPagar };
}

export async function actualizarSeleccionTotal(valor: SeleccionTotal): Promise<void> {
  const data = {
    seleccionTotalAprobar: valor.aprobar,
    seleccionTotalRevisar: valor.revisar,
    seleccionTotalPagar: valor.pagar,
  };
  await db.parametro.upsert({
    where: { id: ID_PARAMETRO_GLOBAL },
    create: { id: ID_PARAMETRO_GLOBAL, ...data },
    update: data,
  });
}
