// lib/registrarAcceso.ts
// Deja constancia de un login exitoso (PIN o biometría) para la bitácora
// de accesos que ve Super Admin. Es solo auditoría — si falla por lo que
// sea, no debe frenar ni afectar el login real.

import { db } from "./db";

// Sin límite, esta tabla crece un registro por cada login para siempre —
// con cientos de usuarios logueándose a diario se vuelve una lista
// interminable que no aporta nada pasado cierto tiempo (la bitácora es
// para revisar accesos recientes, no un historial permanente) y sigue
// gastando espacio/consultas de por vida. En vez de un cron aparte (esta
// app no tiene infraestructura para jobs programados), se poda sola en
// cada login: barato gracias al índice en creadoEn, y se autocorrige con
// el uso normal aunque nadie lo revise nunca a mano.
const RETENCION_ACCESOS_DIAS = 10;

export async function registrarAcceso(usuarioId: string, metodo: "PIN" | "BIOMETRIA", req: Request) {
  try {
    const fwd = req.headers.get("x-forwarded-for");
    const ip = fwd ? fwd.split(",")[0].trim() : null;
    const userAgent = req.headers.get("user-agent");
    const limite = new Date();
    limite.setDate(limite.getDate() - RETENCION_ACCESOS_DIAS);
    await db.$transaction([
      db.registroAcceso.create({ data: { usuarioId, metodo, ip, userAgent } }),
      db.registroAcceso.deleteMany({ where: { creadoEn: { lt: limite } } }),
    ]);
  } catch {
    // No bloqueamos el login si la bitácora falla.
  }
}
