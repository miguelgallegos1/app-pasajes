// app/api/notificaciones/suscribir/route.ts
// POST: guarda (o actualiza) la suscripción push del dispositivo actual
// para el usuario logueado. Se llama justo después de que el navegador
// acepta el permiso de notificaciones y crea la suscripción.

import { NextResponse } from "next/server";
import { db } from "../../../../lib/db";
import { getSession } from "../../../../lib/auth";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { endpoint, keys } = await req.json().catch(() => ({}));
  if (typeof endpoint !== "string" || !keys?.p256dh || !keys?.auth) {
    return NextResponse.json({ error: "Suscripción inválida" }, { status: 400 });
  }

  await db.pushSubscription.upsert({
    where: { endpoint },
    update: { usuarioId: session.id, p256dh: keys.p256dh, auth: keys.auth },
    create: { usuarioId: session.id, endpoint, p256dh: keys.p256dh, auth: keys.auth },
  });

  return NextResponse.json({ ok: true });
}
