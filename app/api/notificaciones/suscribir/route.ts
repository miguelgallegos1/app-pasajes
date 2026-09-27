// app/api/notificaciones/suscribir/route.ts
// POST: guarda (o actualiza) la suscripción push del dispositivo actual
// para el usuario logueado. Se llama justo después de que el navegador
// acepta el permiso de notificaciones y crea la suscripción.

import { NextResponse } from "next/server";
import { db } from "../../../../lib/db";
import { getSession } from "../../../../lib/auth";

// Solo servicios de push reales (Chrome/Edge/Android, Firefox, Windows,
// Safari/iOS). Sin esto, cualquier usuario podía registrar una URL
// cualquiera y hacer que el servidor le enviara pedidos (SSRF).
const HOSTS_PUSH = [/^fcm\.googleapis\.com$/, /^updates\.push\.services\.mozilla\.com$/, /\.notify\.windows\.com$/, /(^|\.)push\.apple\.com$/];

function endpointValido(endpoint: string): boolean {
  try {
    const url = new URL(endpoint);
    return url.protocol === "https:" && HOSTS_PUSH.some((h) => h.test(url.hostname));
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { endpoint, keys } = await req.json().catch(() => ({}));
  if (
    typeof endpoint !== "string" ||
    endpoint.length > 1000 ||
    !endpointValido(endpoint) ||
    typeof keys?.p256dh !== "string" ||
    typeof keys?.auth !== "string"
  ) {
    return NextResponse.json({ error: "Suscripción inválida" }, { status: 400 });
  }

  await db.pushSubscription.upsert({
    where: { endpoint },
    update: { usuarioId: session.id, p256dh: keys.p256dh, auth: keys.auth },
    create: { usuarioId: session.id, endpoint, p256dh: keys.p256dh, auth: keys.auth },
  });

  return NextResponse.json({ ok: true });
}
