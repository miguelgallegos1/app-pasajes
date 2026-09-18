// app/api/admin/accesos/[usuarioId]/revocar/route.ts
// POST: fuerza el cierre de cualquier sesión activa de ese usuario (todos
// sus dispositivos a la vez — el token no distingue cuál es cuál). No
// borra nada: solo marca "sesionesRevocadasEn = ahora", y getSession()/
// proxy.ts invalidan cualquier token firmado antes de ese momento. Solo
// Super Admin.

import { NextResponse } from "next/server";
import { db } from "../../../../../../lib/db";
import { getSession } from "../../../../../../lib/auth";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ usuarioId: string }> }
) {
  const session = await getSession();
  if (!session || session.rol !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { usuarioId } = await params;
  const usuario = await db.usuario.findUnique({ where: { id: usuarioId } });
  if (!usuario) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  await db.usuario.update({ where: { id: usuarioId }, data: { sesionesRevocadasEn: new Date() } });

  return NextResponse.json({ ok: true });
}
