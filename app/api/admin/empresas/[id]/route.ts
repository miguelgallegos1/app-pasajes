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

  const empresa = await db.empresa.findUnique({ where: { id } });
  if (!empresa) return NextResponse.json({ error: "Empresa no encontrada" }, { status: 404 });

  const data: Record<string, unknown> = {};
  if (nombre?.trim()) data.nombre = nombre.trim().toUpperCase();
  if (ruc !== undefined) data.ruc = ruc?.trim() ? ruc.trim().toUpperCase() : null;
  if (typeof activo === "boolean") data.activo = activo;

  try {
    const actualizada = await db.empresa.update({ where: { id }, data });
    return NextResponse.json(actualizada);
  } catch (e: any) {
    if (e.code === "P2002") return NextResponse.json({ error: "Ya existe una empresa con ese RUC" }, { status: 400 });
    throw e;
  }
}