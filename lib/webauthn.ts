// lib/webauthn.ts
// Configuración compartida de WebAuthn (passkeys) para el login biométrico.
// rpID/origin se derivan de la propia petición para que funcione igual en
// producción, en cada preview de Vercel y en desarrollo local, sin hardcodear
// el dominio.

import { APP_NOMBRE } from "./config";

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
