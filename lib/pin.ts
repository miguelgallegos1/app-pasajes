// lib/pin.ts
// Huella determinística del PIN para poder ENCONTRARLO con una consulta
// indexada (WHERE pinLookup = ...) en vez de comparar con bcrypt contra
// todos los usuarios uno por uno (eso es lo que hacía lento el login a
// medida que crecía la cantidad de usuarios). La validación real de la
// contraseña sigue siendo bcrypt.compare contra pinHash; esto solo acelera
// encontrar AL candidato.

import { createHmac } from "crypto";

export function calcularPinLookup(pin: string): string {
  return createHmac("sha256", `${process.env.JWT_SECRET}:pin-lookup`).update(pin).digest("hex");
}
