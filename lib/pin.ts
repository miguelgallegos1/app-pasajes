// lib/pin.ts
// Huella determinística del PIN para poder ENCONTRARLO con una consulta
// indexada (WHERE pinLookup = ...) en vez de comparar con bcrypt contra
// todos los usuarios uno por uno (eso es lo que hacía lento el login a
// medida que crecía la cantidad de usuarios). La validación real de la
// contraseña sigue siendo bcrypt.compare contra pinHash; esto solo acelera
// encontrar AL candidato.

import bcrypt from "bcryptjs";
import { createHmac, randomBytes } from "crypto";
import { JWT_SECRET } from "./jwtSecret";

export function calcularPinLookup(pin: string): string {
  return createHmac("sha256", `${JWT_SECRET}:pin-lookup`).update(pin).digest("hex");
}

// Credenciales de una ficha que NO debe poder ingresar con PIN (la de
// alguien que ya es usuario de la app, ver Usuario.codigoNomina): ningún
// PIN de 6 dígitos coincide con este hash, y la huella no tiene la forma de
// una real, así que nunca la encuentra el login ni ocupa un PIN libre.
export async function credencialesSinAcceso(): Promise<{ pinHash: string; pinLookup: string }> {
  return {
    pinHash: await bcrypt.hash(randomBytes(32).toString("hex"), 10),
    pinLookup: `sin-pin:${randomBytes(16).toString("hex")}`,
  };
}
