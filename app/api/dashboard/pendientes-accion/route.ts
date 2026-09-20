// app/api/dashboard/pendientes-accion/route.ts
// GET: lo mismo que ya calcula el Dashboard (lib/alertasPendientes), pero
// como endpoint aparte para que la campanita del header lo pida al montar
// AppShell y en cada sondeo periódico (ver NotificacionesMenu.tsx) — no en
// cada cambio de pantalla, para no sumar otra consulta a cada clic del menú.
// No-store explícito: sin esto, un caché intermedio (algunos navegadores
// móviles son más agresivos con esto) podía devolver un valor viejo y
// dejar la campanita sin reflejar cambios recientes.

import { NextResponse } from "next/server";
import { getSession } from "../../../../lib/auth";
import { obtenerAlertaPendiente } from "../../../../lib/alertasPendientes";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401, headers: { "Cache-Control": "no-store" } });

  const alerta = await obtenerAlertaPendiente(session);
  return NextResponse.json({ alerta }, { headers: { "Cache-Control": "no-store" } });
}
