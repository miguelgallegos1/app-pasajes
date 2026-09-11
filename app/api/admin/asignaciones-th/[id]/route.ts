// app/api/admin/asignaciones-th/[id]/route.ts
// DELETE: Super Admin quita una asignación de TH.

import { NextResponse } from "next/server";
import { db } from "../../../../../lib/db";
import { getSession } from "../../../../../lib/auth";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.rol !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id } = await params;

  const asignacion = await db.asignacionTH.findUnique({ where: { id } });
  if (!asignacion) return NextResponse.json({ error: "Asignación no encontrada" }, { status: 404 });

  await db.asignacionTH.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}