// app/api/admin/areas/[id]/route.ts
// PATCH: Super Admin edita el nombre de un Área.

import { NextResponse } from "next/server";
import { db } from "../../../../../lib/db";
import { getSession } from "../../../../../lib/auth";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.rol !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id } = await params;
  const { nombre } = await req.json();
  if (!nombre?.trim()) return NextResponse.json({ error: "El nombre es obligatorio" }, { status: 400 });

  const area = await db.area.findUnique({ where: { id } });
  if (!area) return NextResponse.json({ error: "Área no encontrada" }, { status: 404 });

  const actualizada = await db.area.update({ where: { id }, data: { nombre: nombre.trim().toUpperCase() } });
  return NextResponse.json(actualizada);
}