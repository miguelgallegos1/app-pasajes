// lib/webauthn.ts
// Configuración compartida de WebAuthn (passkeys) para el login biométrico.
// rpID/origin se derivan de la propia petición para que funcione igual en
// producción, en cada preview de Vercel y en desarrollo local, sin hardcodear
// el dominio.

import { SignJWT, jwtVerify } from "jose";
import { APP_NOMBRE } from "./config";
import { JWT_SECRET } from "./jwtSecret";

export function obtenerRpConfig(req: Request) {
  const url = new URL(req.url);
  return {
    rpName: APP_NOMBRE,
    rpID: url.hostname,
    origin: url.origin,
  };
}

// Cookie de corta duración que guarda el "challenge" entre el paso de
// generar opciones y el de verificar la respuesta del autenticador.
export const COOKIE_DESAFIO = "webauthn_desafio";
export const DURACION_DESAFIO_SEGUNDOS = 120;

// El challenge viaja en la cookie FIRMADO por el servidor y con
// vencimiento propio: antes era JSON plano, así que un atacante podía
// ponerse una cookie con un challenge viejo y reutilizar una respuesta
// capturada. Además se borra apenas se usa (un solo intento).
const secretoDesafio = new TextEncoder().encode(JWT_SECRET);
type Desafio = { challenge: string; usuarioId?: string };

export async function firmarDesafio(desafio: Desafio): Promise<string> {
  return new SignJWT({ ...desafio, uso: "webauthn" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${DURACION_DESAFIO_SEGUNDOS}s`)
    .sign(secretoDesafio);
}

export async function leerDesafio(valor: string | undefined): Promise<Desafio | null> {
  if (!valor) return null;
  try {
    const { payload } = await jwtVerify(valor, secretoDesafio);
    if (payload.uso !== "webauthn" || typeof payload.challenge !== "string") return null;
    return { challenge: payload.challenge, usuarioId: typeof payload.usuarioId === "string" ? payload.usuarioId : undefined };
  } catch {
    return null;
  }
}
