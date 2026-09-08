// app/api/auth/webauthn/credenciales/[id]/route.ts
// DELETE: desactiva el acceso biométrico de un dispositivo (ej. lo perdiste
// o cambiaste de equipo). Solo el dueño de la credencial puede quitarla.

import { NextResponse } from "next/server";
import { db } from "../../../../../../lib/db";
import { getSession } from "../../../../../../lib/auth";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const credencial = await db.credencialBiometrica.findUnique({ where: { id } });
  if (!credencial || credencial.usuarioId !== session.id) {
    return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  }

  await db.credencialBiometrica.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
