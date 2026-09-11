// app/api/admin/usuarios/[id]/route.ts
// PATCH: edita nombre/estado activo/PIN de un usuario de TH/Coordinador/Nómina/Admin.
// DELETE: elimina permanentemente, solo si no aprobó/pagó nada en el
// historial (si lo hizo, solo se puede desactivar para no perder trazabilidad).

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "../../../../../lib/db";
import { getSession } from "../../../../../lib/auth";
import { calcularPinLookup } from "../../../../../lib/pin";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.rol !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id } = await params;
  const { nombre, activo, pin } = await req.json();

  const data: Record<string, unknown> = {};
  if (nombre?.trim()) data.nombre = nombre.trim().toUpperCase();
  if (typeof activo === "boolean") data.activo = activo;

  // Resetear el PIN es opcional: si no viene en el body, el actual no se
  // toca. El hash nunca se puede "recuperar", solo reemplazar por uno
  // nuevo — por eso esto es un reset, no un "ver PIN".
  if (pin !== undefined) {
    if (typeof pin !== "string" || !/^\d{6}$/.test(pin)) {
      return NextResponse.json({ error: "El PIN debe tener exactamente 6 dígitos" }, { status: 400 });
    }
    const pinLookup = calcularPinLookup(pin);
    const yaExiste = await db.usuario.findFirst({ where: { pinLookup, id: { not: id } } });
    if (yaExiste) {
      return NextResponse.json({ error: "Ese PIN ya está en uso, elige otro" }, { status: 400 });
    }
    const usuariosSinMigrar = await db.usuario.findMany({
      where: { pinLookup: null, id: { not: id } },
      select: { pinHash: true },
    });
    for (const u of usuariosSinMigrar) {
      if (await bcrypt.compare(pin, u.pinHash)) {
        return NextResponse.json({ error: "Ese PIN ya está en uso, elige otro" }, { status: 400 });
      }
    }
    data.pinHash = await bcrypt.hash(pin, 10);
    data.pinLookup = pinLookup;
  }

  const actualizado = await db.usuario.update({ where: { id }, data });
  return NextResponse.json(actualizado);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.rol !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id } = await params;

  if (id === session.id) {
    return NextResponse.json({ error: "No puedes eliminar tu propia cuenta" }, { status: 400 });
  }

  const [aprobadas, pagadas] = await Promise.all([
    db.solicitudPasaje.count({ where: { aprobadoPorId: id } }),
    db.solicitudPasaje.count({ where: { pagadoPorId: id } }),
  ]);

  if (aprobadas > 0 || pagadas > 0) {
    return NextResponse.json(
      { error: "No se puede eliminar: aprobó o pagó solicitudes en el historial. Solo puedes desactivarlo." },
      { status: 400 }
    );
  }

  // Todo en una sola transacción: si el usuario tiene una passkey
  // registrada (CredencialBiometrica tiene FK obligatoria hacia Usuario,
  // sin cascada), borrarla en un paso aparte podía dejar el borrado a
  // medias (asignaciones ya borradas, usuario.delete fallando por la FK).
  await db.$transaction([
    db.credencialBiometrica.deleteMany({ where: { usuarioId: id } }),
    // Las asignaciones de TH son solo configuración de acceso, no historial,
    // así que se pueden borrar junto con el usuario sin problema.
    db.asignacionTH.deleteMany({ where: { usuarioId: id } }),
    db.usuario.delete({ where: { id } }),
  ]);

  return NextResponse.json({ ok: true });
}