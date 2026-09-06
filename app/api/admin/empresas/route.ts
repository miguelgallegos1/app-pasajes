// app/api/admin/empresas/route.ts
// POST: Super Admin crea una Empresa nueva.

import { NextResponse } from "next/server";
import { db } from "../../../../lib/db";
import { getSession } from "../../../../lib/auth";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.rol !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { nombre, ruc } = await req.json();
  if (!nombre?.trim()) return NextResponse.json({ error: "El nombre es obligatorio" }, { status: 400 });

  try {
    const empresa = await db.empresa.create({ data: { nombre: nombre.trim(), ruc: ruc?.trim() || null } });
    return NextResponse.json(empresa, { status: 201 });
  } catch (e: any) {
    if (e.code === "P2002") return NextResponse.json({ error: "Ya existe una empresa con ese RUC" }, { status: 400 });
    throw e;
  }
}