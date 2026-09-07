// app/api/admin/usuarios/route.ts
// POST: Super Admin crea un usuario de TH, Finanzas o Super Admin.
// (Los usuarios tipo Colaborador se crean aparte, desde el panel de TH.)

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "../../../../lib/db";
import { getSession } from "../../../../lib/auth";

const ROLES_PERMITIDOS = ["ADMIN_TH", "FINANZAS", "SUPER_ADMIN"];

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.rol !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { nombre, email, pin, rol } = await req.json();

  if (!nombre?.trim() || !pin || !rol) {
    return NextResponse.json({ error: "Nombre, PIN y rol son obligatorios" }, { status: 400 });
  }
  if (!ROLES_PERMITIDOS.includes(rol)) {
    return NextResponse.json({ error: "Rol inválido" }, { status: 400 });
  }
  if (!/^\d{6}$/.test(pin)) {
    return NextResponse.json({ error: "El PIN debe tener exactamente 6 dígitos" }, { status: 400 });
  }

  const usuarios = await db.usuario.findMany({ select: { pinHash: true } });
  for (const u of usuarios) {
    if (await bcrypt.compare(pin, u.pinHash)) {
      return NextResponse.json({ error: "Ese PIN ya está en uso, elige otro" }, { status: 400 });
    }
  }

  const pinHash = await bcrypt.hash(pin, 10);

  const nuevo = await db.usuario.create({
    data: { nombre: nombre.trim().toUpperCase(), email: email || null, pinHash, rol },
  });

  return NextResponse.json(nuevo, { status: 201 });
}