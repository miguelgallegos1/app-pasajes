// lib/pinFirmado.ts
// PIN generado por el servidor + firma, para que TH solo pueda GUARDAR
// PINs que generó el propio sistema (botón "Generar" en Colaboradores).
// Sin esto, armando el pedido a mano se podía probar cualquier PIN y la
// respuesta "Ese PIN ya está en uso" revelaba que ese PIN entra como
// alguien (incluso un Super Admin). La firma vale VIGENCIA y liga el PIN
// a quien lo pidió.

import { SignJWT, jwtVerify } from "jose";
import { JWT_SECRET } from "./jwtSecret";

const secret = new TextEncoder().encode(JWT_SECRET);
const VIGENCIA = "30m";

export async function firmarPin(pin: string, usuarioId: string): Promise<string> {
  return new SignJWT({ pin, uso: "pin-generado" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(usuarioId)
    .setIssuedAt()
    .setExpirationTime(VIGENCIA)
    .sign(secret);
}

// true si `firma` es una firma vigente de ESTE pin, emitida para este usuario.
export async function pinFirmadoValido(pin: unknown, firma: unknown, usuarioId: string): Promise<boolean> {
  if (typeof pin !== "string" || typeof firma !== "string") return false;
  try {
    const { payload } = await jwtVerify(firma, secret);
    return payload.uso === "pin-generado" && payload.pin === pin && payload.sub === usuarioId;
  } catch {
    return false;
  }
}
