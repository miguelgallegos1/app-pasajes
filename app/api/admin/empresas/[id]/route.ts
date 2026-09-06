// app/api/admin/empresas/[id]/route.ts
// PATCH: Super Admin edita nombre/RUC/estado activo de una Empresa.

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
  const { nombre, ruc, activo } = await req.json();

  const data: Record<string, unknown> = {};
  if (nombre?.trim()) data.nombre = nombre.trim();
  if (ruc !== undefined) data.ruc = ruc?.trim() || null;
  if (typeof activo === "boolean") data.activo = activo;

  const actualizada = await db.empresa.update({ where: { id }, data });
  return NextResponse.json(actualizada);
}