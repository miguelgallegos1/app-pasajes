// app/api/admin/areas/route.ts
// POST: Super Admin crea un Área dentro de un Sitio.

import { NextResponse } from "next/server";
import { db } from "../../../../lib/db";
import { getSession } from "../../../../lib/auth";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.rol !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { sitioId, nombre } = await req.json();
  if (!sitioId || !nombre?.trim()) {
    return NextResponse.json({ error: "Sitio y nombre son obligatorios" }, { status: 400 });
  }

  const area = await db.area.create({ data: { sitioId, nombre: nombre.trim() } });
  return NextResponse.json(area, { status: 201 });
}