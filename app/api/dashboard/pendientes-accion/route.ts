// app/api/dashboard/pendientes-accion/route.ts
// GET: lo mismo que ya calcula el Dashboard (lib/alertasPendientes), pero
// como endpoint aparte para que la campanita del header lo pida UNA vez al
// montar AppShell (que no se remonta entre navegaciones) — no en cada
// cambio de pantalla, para no sumar otra consulta a cada clic del menú.

import { NextResponse } from "next/server";
import { getSession } from "../../../../lib/auth";
import { obtenerAlertaPendiente } from "../../../../lib/alertasPendientes";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const alerta = await obtenerAlertaPendiente(session);
  return NextResponse.json({ alerta });
}
