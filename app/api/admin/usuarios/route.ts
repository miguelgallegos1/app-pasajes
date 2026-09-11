// app/api/admin/usuarios/route.ts
// POST: Super Admin crea un usuario de TH, Coordinador, Nómina o Super Admin.
// (Los usuarios tipo Colaborador se crean aparte, desde el panel de TH.)

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "../../../../lib/db";
import { getSession } from "../../../../lib/auth";
import { calcularPinLookup } from "../../../../lib/pin";

const ROLES_PERMITIDOS = ["ADMIN_TH", "COORDINADOR", "NOMINA", "SUPER_ADMIN"];

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

  const pinLookup = calcularPinLookup(pin);
  const yaExiste = await db.usuario.findFirst({ where: { pinLookup } });
  if (yaExiste) {
    return NextResponse.json({ error: "Ese PIN ya está en uso, elige otro" }, { status: 400 });
  }
  const usuariosSinMigrar = await db.usuario.findMany({ where: { pinLookup: null }, select: { pinHash: true } });
  for (const u of usuariosSinMigrar) {
    if (await bcrypt.compare(pin, u.pinHash)) {
      return NextResponse.json({ error: "Ese PIN ya está en uso, elige otro" }, { status: 400 });
    }
  }

  const pinHash = await bcrypt.hash(pin, 10);

  try {
    const nuevo = await db.usuario.create({
      data: { nombre: nombre.trim().toUpperCase(), email: email || null, pinHash, pinLookup, rol },
    });
    return NextResponse.json(nuevo, { status: 201 });
  } catch (e: any) {
    if (e.code === "P2002") {
      return NextResponse.json({ error: "Ese email ya está en uso por otro usuario" }, { status: 400 });
    }
    throw e;
  }
}