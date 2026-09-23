// app/api/admin/areas/[id]/route.ts
// PATCH: Super Admin edita el nombre de un Área.
// DELETE: Super Admin elimina un Área sin dependencias.

import { NextResponse } from "next/server";
import { db } from "../../../../../lib/db";
import { getSession } from "../../../../../lib/auth";
import { limpiarNumeroWhatsapp } from "../../../../../lib/whatsappTH";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.rol !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id } = await params;
  const { nombre, whatsapp } = await req.json();
  if (!nombre?.trim()) return NextResponse.json({ error: "El nombre es obligatorio" }, { status: 400 });

  const area = await db.area.findUnique({ where: { id } });
  if (!area) return NextResponse.json({ error: "Área no encontrada" }, { status: 404 });

  const data: Record<string, unknown> = { nombre: nombre.trim().toUpperCase() };
  if (whatsapp !== undefined) data.whatsapp = whatsapp?.trim() ? limpiarNumeroWhatsapp(whatsapp) : null;

  const actualizada = await db.area.update({ where: { id }, data });
  return NextResponse.json(actualizada);
}
// DELETE: solo si el Área no tiene colaboradores, rutas ni asignaciones de TH.
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.rol !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id } = await params;
  const area = await db.area.findUnique({
    where: { id },
    select: { _count: { select: { colaboradores: true, rutas: true, asignaciones: true } } },
  });
  if (!area) return NextResponse.json({ error: "Área no encontrada" }, { status: 404 });

  const { colaboradores, rutas, asignaciones } = area._count;
  if (colaboradores || rutas || asignaciones) {
    return NextResponse.json(
      { error: `No se puede eliminar: tiene ${colaboradores} colaborador(es), ${rutas} ruta(s) y ${asignaciones} asignación(es) de TH asociadas.` },
      { status: 409 }
    );
  }

  await db.area.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
