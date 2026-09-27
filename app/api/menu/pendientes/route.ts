// app/api/menu/pendientes/route.ts
// GET: el número del menú (ver lib/contadorMenu.ts). Lo pide AppShell al
// entrar, al volver a la app y cada 5 minutos (solo TH/Coordinación/
// Nómina) — no en cada cambio de pantalla.
// No-store explícito: algunos navegadores móviles cachean de más y el
// número quedaba desactualizado.

import { NextResponse } from "next/server";
import { getSession } from "../../../../lib/auth";
import { contarPendientesMenu } from "../../../../lib/contadorMenu";

export const dynamic = "force-dynamic";

const SIN_CACHE = { headers: { "Cache-Control": "no-store" } };

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401, ...SIN_CACHE });

  const total = await contarPendientesMenu(session);
  return NextResponse.json({ total }, SIN_CACHE);
}
