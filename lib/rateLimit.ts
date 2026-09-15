// lib/rateLimit.ts
// Limitador de intentos de login contra fuerza bruta (6 dígitos = solo
// 1.000.000 de combinaciones posibles). El contador vive en la base de
// datos (tabla IntentoLogin), no en memoria del proceso: en un entorno
// serverless (Vercel) cada instancia puede tener su propia memoria y
// reiniciarse en cualquier momento, así que un contador en memoria no
// da un límite confiable. Guardarlo en la base sí sobrevive a eso.

import { db } from "./db";

const VENTANA_MS = 5 * 60 * 1000; // 5 minutos
const MAX_INTENTOS = 3;

// Devuelve false si `clave` (normalmente la IP del cliente) ya superó
// MAX_INTENTOS dentro de la ventana de tiempo actual.
export async function intentoPermitido(clave: string): Promise<boolean> {
  const ahora = new Date();

  const entrada = await db.intentoLogin.findUnique({ where: { clave } });

  // Sin registro previo, o la ventana anterior ya venció: arranca una
  // ventana nueva (esto también hace de limpieza: cada IP que vuelve a
  // intentar después de vencida "recicla" su propia fila en vez de
  // acumular filas nuevas sin límite).
  if (!entrada || entrada.venceEn < ahora) {
    await db.intentoLogin.upsert({
      where: { clave },
      create: { clave, conteo: 1, venceEn: new Date(ahora.getTime() + VENTANA_MS) },
      update: { conteo: 1, venceEn: new Date(ahora.getTime() + VENTANA_MS) },
    });
    return true;
  }

  if (entrada.conteo >= MAX_INTENTOS) return false;

  await db.intentoLogin.update({ where: { clave }, data: { conteo: { increment: 1 } } });
  return true;
}

export function obtenerIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return "desconocida";
}
