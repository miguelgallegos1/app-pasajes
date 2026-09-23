// app/api/admin/sitios/[id]/route.ts
// PATCH: Super Admin edita nombre/dirección de un Sitio.
// DELETE: Super Admin elimina un Sitio sin dependencias.

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
  const { nombre, direccion, whatsapp } = await req.json();

  const sitio = await db.sitioProductivo.findUnique({ where: { id } });
  if (!sitio) return NextResponse.json({ error: "Sitio no encontrado" }, { status: 404 });

  const data: Record<string, unknown> = {};
  if (nombre?.trim()) data.nombre = nombre.trim().toUpperCase();
  if (direccion !== undefined) data.direccion = direccion?.trim() ? direccion.trim().toUpperCase() : null;
  if (whatsapp !== undefined) data.whatsapp = whatsapp?.trim() ? limpiarNumeroWhatsapp(whatsapp) : null;

  const actualizado = await db.sitioProductivo.update({ where: { id }, data });
  return NextResponse.json(actualizado);
}
// DELETE: solo si el Sitio no tiene áreas, colaboradores, rutas ni asignaciones de TH.
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.rol !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id } = await params;
  const sitio = await db.sitioProductivo.findUnique({
    where: { id },
    select: { _count: { select: { areas: true, colaboradores: true, rutas: true, asignaciones: true } } },
  });
  if (!sitio) return NextResponse.json({ error: "Sitio no encontrado" }, { status: 404 });

  const { areas, colaboradores, rutas, asignaciones } = sitio._count;
  if (areas || colaboradores || rutas || asignaciones) {
    return NextResponse.json(
      { error: `No se puede eliminar: tiene ${areas} área(s), ${colaboradores} colaborador(es), ${rutas} ruta(s) y ${asignaciones} asignación(es) de TH asociadas.` },
      { status: 409 }
    );
  }

  await db.sitioProductivo.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
