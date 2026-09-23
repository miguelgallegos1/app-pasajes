// app/api/admin/empresas/[id]/route.ts
// PATCH: Super Admin edita nombre/RUC/estado activo de una Empresa.
// DELETE: Super Admin elimina una Empresa sin dependencias.

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
  const { nombre, ruc, activo, whatsapp } = await req.json();

  const empresa = await db.empresa.findUnique({ where: { id } });
  if (!empresa) return NextResponse.json({ error: "Empresa no encontrada" }, { status: 404 });

  const data: Record<string, unknown> = {};
  if (nombre?.trim()) data.nombre = nombre.trim().toUpperCase();
  if (ruc !== undefined) data.ruc = ruc?.trim() ? ruc.trim().toUpperCase() : null;
  if (typeof activo === "boolean") data.activo = activo;
  if (whatsapp !== undefined) data.whatsapp = whatsapp?.trim() ? limpiarNumeroWhatsapp(whatsapp) : null;

  try {
    const actualizada = await db.empresa.update({ where: { id }, data });
    return NextResponse.json(actualizada);
  } catch (e) {
    if (e instanceof Error && "code" in e && e.code === "P2002") {
      return NextResponse.json({ error: "Ya existe una empresa con ese RUC" }, { status: 400 });
    }
    throw e;
  }
}
// DELETE: solo si la Empresa no tiene sitios, rutas ni asignaciones de TH.
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.rol !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id } = await params;
  const empresa = await db.empresa.findUnique({
    where: { id },
    select: { _count: { select: { sitios: true, rutas: true, asignaciones: true } } },
  });
  if (!empresa) return NextResponse.json({ error: "Empresa no encontrada" }, { status: 404 });

  const { sitios, rutas, asignaciones } = empresa._count;
  if (sitios || rutas || asignaciones) {
    return NextResponse.json(
      { error: `No se puede eliminar: tiene ${sitios} sitio(s), ${rutas} ruta(s) y ${asignaciones} asignación(es) de TH asociadas.` },
      { status: 409 }
    );
  }

  await db.empresa.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
