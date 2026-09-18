// lib/registrarAcceso.ts
// Deja constancia de un login exitoso (PIN o biometría) para la bitácora
// de accesos que ve Super Admin. Es solo auditoría — si falla por lo que
// sea, no debe frenar ni afectar el login real.

import { db } from "./db";

export async function registrarAcceso(usuarioId: string, metodo: "PIN" | "BIOMETRIA", req: Request) {
  try {
    const fwd = req.headers.get("x-forwarded-for");
    const ip = fwd ? fwd.split(",")[0].trim() : null;
    const userAgent = req.headers.get("user-agent");
    await db.registroAcceso.create({ data: { usuarioId, metodo, ip, userAgent } });
  } catch {
    // No bloqueamos el login si la bitácora falla.
  }
}
