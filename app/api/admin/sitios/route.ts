// app/api/admin/sitios/route.ts
// POST: Super Admin crea un Sitio dentro de una Empresa.

import { NextResponse } from "next/server";
import { db } from "../../../../lib/db";
import { getSession } from "../../../../lib/auth";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.rol !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { empresaId, nombre, direccion } = await req.json();
  if (!empresaId || !nombre?.trim()) {
    return NextResponse.json({ error: "Empresa y nombre son obligatorios" }, { status: 400 });
  }

  const empresa = await db.empresa.findUnique({ where: { id: empresaId } });
  if (!empresa) {
    return NextResponse.json({ error: "La empresa indicada no existe" }, { status: 400 });
  }

  const sitio = await db.sitioProductivo.create({
    data: {
      empresaId,
      nombre: nombre.trim().toUpperCase(),
      direccion: direccion?.trim() ? direccion.trim().toUpperCase() : null,
    },
  });
  return NextResponse.json(sitio, { status: 201 });
}