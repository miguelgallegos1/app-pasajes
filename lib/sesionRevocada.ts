// lib/sesionRevocada.ts
// Compartido entre getSession() (lib/auth.ts) y proxy.ts: si el usuario
// tiene algo en sesionesRevocadasEn y el token se emitió ANTES de ese
// momento, la sesión ya no es válida aunque la firma y la expiración del
// JWT sigan siendo correctas — es lo que permite a Super Admin forzar el
// cierre de una sesión ajena sin esperar a que expire sola (30 min).
// Separado de lib/auth.ts a propósito: ese módulo importa next/headers
// (solo válido en Server Components/Route Handlers) y proxy.ts no debería
// arrastrarlo con un import que ni siquiera usa.

import { db } from "./db";

export async function sesionRevocada(usuarioId: string, iatSegundos?: number): Promise<boolean> {
  // Tokens sin "iat" (emitidos antes de este cambio) no se pueden
  // comparar: se dejan expirar solos en vez de tratarlos como revocados.
  if (!iatSegundos) return false;

  const usuario = await db.usuario.findUnique({
    where: { id: usuarioId },
    select: { sesionesRevocadasEn: true },
  });
  if (!usuario?.sesionesRevocadasEn) return false;

  return iatSegundos * 1000 < usuario.sesionesRevocadasEn.getTime();
}
