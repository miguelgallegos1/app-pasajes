// lib/rateLimit.ts
// Límite de intentos de login por IP, guardado en la base (IntentoLogin)
// para que valga entre todas las instancias del servidor.
//
// Cada intento se RESERVA con una sola sentencia SQL atómica (incrementa
// y devuelve el conteo, reiniciando la ventana si venció): pedidos en
// paralelo reciben conteos distintos y no pueden colarse todos a la vez.
// Un login correcto LIBERA su propio intento (solo cuentan los fallos),
// así varias personas que salen a internet por la misma IP (una planta
// detrás de un NAT) no se bloquean entre sí al entrar bien. Se libera solo
// el intento propio (decremento), no se borra el contador: entrar con un
// PIN válido no "limpia" los fallos anteriores de esa IP.

import { db } from "./db";

const VENTANA_MS = 5 * 60 * 1000; // 5 minutos
const MAX_FALLOS = 5;

// Fecha como texto UTC sin zona ("2026-09-26 14:05:00.000"): la columna
// es timestamp SIN zona y Prisma guarda ahí la hora UTC; pasándola así (y
// casteando en SQL) el resultado no depende de la zona de la sesión.
function utcSql(d: Date): string {
  return d.toISOString().replace("T", " ").replace("Z", "");
}

// true si esta IP todavía puede intentar (y deja el intento reservado).
export async function reservarIntento(clave: string): Promise<boolean> {
  const ahora = utcSql(new Date());
  const vence = utcSql(new Date(Date.now() + VENTANA_MS));
  // Si la consulta fallara (base caída, error inesperado), el login sigue
  // funcionando sin límite en vez de dejar a TODOS afuera; queda en el log.
  let filas: { conteo: number }[];
  try {
    filas = await db.$queryRaw<{ conteo: number }[]>`
    INSERT INTO "IntentoLogin" ("clave", "conteo", "venceEn")
    VALUES (${clave}, 1, ${vence}::timestamp(3))
    ON CONFLICT ("clave") DO UPDATE SET
      "conteo" = CASE WHEN "IntentoLogin"."venceEn" < ${ahora}::timestamp(3) THEN 1 ELSE "IntentoLogin"."conteo" + 1 END,
      "venceEn" = CASE WHEN "IntentoLogin"."venceEn" < ${ahora}::timestamp(3) THEN ${vence}::timestamp(3) ELSE "IntentoLogin"."venceEn" END
    RETURNING "conteo"`;
  } catch (e) {
    console.error("rateLimit: no se pudo reservar el intento", e);
    return true;
  }
  return Number(filas[0]?.conteo ?? 1) <= MAX_FALLOS;
}

// El intento no fue un fallo (login correcto, o pedido mal formado que no
// llegó a probar un PIN): devuelve la reserva.
export async function liberarIntento(clave: string): Promise<void> {
  await db.intentoLogin
    .updateMany({ where: { clave, conteo: { gt: 0 } }, data: { conteo: { decrement: 1 } } })
    .catch(() => {});
}

// IP del cliente. En Vercel, x-real-ip / x-forwarded-for los pone la propia
// plataforma con la IP real (no se pueden falsificar desde el navegador).
export function obtenerIp(req: Request): string {
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return "desconocida";
}
