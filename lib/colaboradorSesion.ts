// lib/colaboradorSesion.ts
// Datos completos del Colaborador logueado, memoizados con cache() de
// React: app/(app)/layout.tsx (para nombre/foto/esSupervisor) y cada
// page.tsx de mis-pasajes piden el MISMO colaborador en la misma petición.
// Sin este cache(), cada navegación pagaba 2 consultas idénticas a la
// base (una del layout, otra de la página) en vez de una sola.
import { cache } from "react";
import { db } from "./db";

export const obtenerColaboradorPorUsuarioId = cache(async (usuarioId: string) => {
  return db.colaborador.findUnique({ where: { usuarioId } });
});
