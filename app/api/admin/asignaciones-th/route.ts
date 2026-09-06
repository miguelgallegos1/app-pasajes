// app/api/admin/asignaciones-th/route.ts
// POST: Super Admin crea una asignación de TH a Empresa/Sitio/Área.

import { NextResponse } from "next/server";
import { db } from "../../../../lib/db";
import { getSession } from "../../../../lib/auth";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.rol !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { usuarioId, empresaId, sitioId, areaId } = await req.json();

  if (!usuarioId || !empresaId) {
    return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
  }

  const usuario = await db.usuario.findUnique({ where: { id: usuarioId } });
  if (!usuario || usuario.rol !== "ADMIN_TH") {
    return NextResponse.json({ error: "Ese usuario no es de Talento Humano" }, { status: 400 });
  }

  const asignacion = await db.asignacionTH.create({
    data: { usuarioId, empresaId, sitioId: sitioId || null, areaId: areaId || null },
  });

  return NextResponse.json(asignacion, { status: 201 });
}   