// app/api/notificaciones/desuscribir/route.ts
// POST: borra la suscripción push del dispositivo actual para el usuario
// logueado — cuando desactiva las notificaciones a mano.

import { NextResponse } from "next/server";
import { db } from "../../../../lib/db";
import { getSession } from "../../../../lib/auth";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { endpoint } = await req.json().catch(() => ({}));
  if (typeof endpoint !== "string") {
    return NextResponse.json({ error: "Falta el endpoint" }, { status: 400 });
  }

  await db.pushSubscription.deleteMany({ where: { endpoint, usuarioId: session.id } });
  return NextResponse.json({ ok: true });
}
