// app/api/admin/sitios/[id]/route.ts
// PATCH: Super Admin edita nombre/dirección de un Sitio.

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
  const { nombre, direccion } = await req.json();

  const data: Record<string, unknown> = {};
  if (nombre?.trim()) data.nombre = nombre.trim();
  if (direccion !== undefined) data.direccion = direccion?.trim() || null;

  const actualizado = await db.sitioProductivo.update({ where: { id }, data });
  return NextResponse.json(actualizado);
}