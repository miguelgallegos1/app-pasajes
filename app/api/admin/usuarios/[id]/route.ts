// app/api/admin/usuarios/[id]/route.ts
// PATCH: edita nombre/estado activo de un usuario de TH/Finanzas/Admin.
// DELETE: elimina permanentemente, solo si no aprobó/pagó nada en el
// historial (si lo hizo, solo se puede desactivar para no perder trazabilidad).

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
  const { nombre, activo } = await req.json();

  const data: Record<string, unknown> = {};
  if (nombre?.trim()) data.nombre = nombre.trim().toUpperCase();
  if (typeof activo === "boolean") data.activo = activo;

  const actualizado = await db.usuario.update({ where: { id }, data });
  return NextResponse.json(actualizado);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.rol !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id } = await params;

  if (id === session.id) {
    return NextResponse.json({ error: "No puedes eliminar tu propia cuenta" }, { status: 400 });
  }

  const [aprobadas, pagadas] = await Promise.all([
    db.solicitudPasaje.count({ where: { aprobadoPorId: id } }),
    db.solicitudPasaje.count({ where: { pagadoPorId: id } }),
  ]);

  if (aprobadas > 0 || pagadas > 0) {
    return NextResponse.json(
      { error: "No se puede eliminar: aprobó o pagó solicitudes en el historial. Solo puedes desactivarlo." },
      { status: 400 }
    );
  }

  // Las asignaciones de TH son solo configuración de acceso, no historial,
  // así que se pueden borrar junto con el usuario sin problema.
  await db.asignacionTH.deleteMany({ where: { usuarioId: id } });
  await db.usuario.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}