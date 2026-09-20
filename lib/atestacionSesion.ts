// lib/atestacionSesion.ts
// Compartido entre proxy.ts (que la firma) y getSession() en lib/auth.ts
// (que la verifica) — ver el comentario grande en getSession() para el
// porqué existe. Separado de lib/auth.ts a propósito, igual que
// sesionRevocada.ts: ese módulo importa next/headers (solo válido en
// Server Components/Route Handlers) y proxy.ts no debería arrastrarlo con
// un import que ni siquiera usa.

import { SignJWT } from "jose";
import { JWT_SECRET } from "./jwtSecret";

const secret = new TextEncoder().encode(JWT_SECRET);

export const HEADER_ATESTACION = "x-sesion-verificada";
export const TIPO_ATESTACION = "verificacion-proxy";
const DURACION_ATESTACION_SEGUNDOS = 10;

// Token corto (10s, alcanza de sobra para esta misma petición) que firma
// proxy.ts después de validar la sesión (incluida sesionRevocada, una
// consulta a la base) para que getSession() no tenga que repetir esa
// misma consulta al renderizar la página.
export async function crearAtestacionSesion(payload: { id: string; rol: string }) {
  return await new SignJWT({ id: payload.id, rol: payload.rol, tipo: TIPO_ATESTACION })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${DURACION_ATESTACION_SEGUNDOS}s`)
    .sign(secret);
}
