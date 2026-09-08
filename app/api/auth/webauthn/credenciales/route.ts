// app/api/auth/webauthn/credenciales/route.ts
// GET: lista los dispositivos con acceso biométrico que el usuario logueado
// ya registró, para poder verlos y quitarlos.

import { NextResponse } from "next/server";
import { db } from "../../../../../lib/db";
import { getSession } from "../../../../../lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const credenciales = await db.credencialBiometrica.findMany({
    where: { usuarioId: session.id },
    orderBy: { creadoEn: "asc" },
    select: { id: true, dispositivo: true, creadoEn: true, ultimoUso: true },
  });

  return NextResponse.json(credenciales);
}
