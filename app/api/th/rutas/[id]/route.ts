// app/api/th/rutas/[id]/route.ts
// PATCH: edita nombre, valor y/o estado activo de una Ruta existente.
// DELETE: elimina permanentemente, solo si no tiene solicitudes asociadas.

import { NextResponse } from "next/server";
import { db } from "../../../../../lib/db";
import { getSession } from "../../../../../lib/auth";
import { obtenerAreasPermitidasTH } from "../../../../../lib/alcanceTH";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || !["ADMIN_TH", "SUPER_ADMIN"].includes(session.rol)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id } = await params;
  const { nombre, valor, activo } = await req.json();

  const ruta = await db.ruta.findUnique({ where: { id } });
  if (!ruta) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

  const areasPermitidas = await obtenerAreasPermitidasTH(session.id, session.rol);
  if (!areasPermitidas.some((a) => a.id === ruta.areaId)) {
    return NextResponse.json({ error: "Esa ruta no está en tu alcance" }, { status: 403 });
  }

  const data: Record<string, unknown> = {};
  if (nombre?.trim()) data.nombre = nombre.trim().toUpperCase();
  if (valor !== undefined) {
    if (Number(valor) <= 0) return NextResponse.json({ error: "El valor debe ser mayor a 0" }, { status: 400 });
    data.valor = Number(valor);
  }
  if (typeof activo === "boolean") data.activo = activo;

  try {
    const actualizada = await db.ruta.update({ where: { id }, data });
    return NextResponse.json(actualizada);
  } catch (e: any) {
    if (e.code === "P2002") {
      return NextResponse.json({ error: "Ya existe una ruta con ese nombre en esa área" }, { status: 400 });
    }
    throw e;
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || !["ADMIN_TH", "SUPER_ADMIN"].includes(session.rol)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id } = await params;

  const ruta = await db.ruta.findUnique({
    where: { id },
    include: { _count: { select: { solicitudes: true } } },
  });
  if (!ruta) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

  const areasPermitidas = await obtenerAreasPermitidasTH(session.id, session.rol);
  if (!areasPermitidas.some((a) => a.id === ruta.areaId)) {
    return NextResponse.json({ error: "Esa ruta no está en tu alcance" }, { status: 403 });
  }

  if (ruta._count.solicitudes > 0) {
    return NextResponse.json(
      { error: "No se puede eliminar: tiene solicitudes registradas. Solo puedes desactivarla." },
      { status: 400 }
    );
  }

  await db.ruta.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}