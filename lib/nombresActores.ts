// lib/nombresActores.ts
// aprobadoPorId / revisadoPorId / pagadoPorId de SolicitudPasaje no tienen
// relación declarada hacia Usuario (son solo el id). Esto resuelve los
// nombres ("Nombre Apellido") con un único IN en vez de una consulta por fila.

import { db } from "./db";
import { acortarNombreLibre } from "./auth";

export async function nombresDeUsuarios(ids: (string | null)[]): Promise<Map<string, string>> {
  const unicos = Array.from(new Set(ids.filter((v): v is string => !!v)));
  if (unicos.length === 0) return new Map();
  const usuarios = await db.usuario.findMany({ where: { id: { in: unicos } }, select: { id: true, nombre: true } });
  return new Map(usuarios.map((u) => [u.id, acortarNombreLibre(u.nombre)]));
}
