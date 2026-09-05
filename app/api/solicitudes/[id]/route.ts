// app/api/solicitudes/[id]/route.ts
// DELETE: el colaborador elimina SU PROPIA solicitud pendiente,
// o un Supervisor elimina una pendiente de alguien de SU equipo.

import { NextResponse } from "next/server";
import { db } from "../../../../lib/db";
import { getSession } from "../../../../lib/auth";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;

  const solicitud = await db.solicitudPasaje.findUnique({
    where: { id },
    include: { colaborador: true },
  });
  if (!solicitud) {
    return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  }

  const miColaborador = await db.colaborador.findUnique({
    where: { usuarioId: session.id },
  });

  const esPropietario = solicitud.colaborador.usuarioId === session.id;
  const esSuSupervisor =
    !!miColaborador?.esSupervisor && solicitud.colaborador.supervisorId === miColaborador.id;
  const esSuperAdmin = session.rol === "SUPER_ADMIN";

  const puedeEliminar =
    esSuperAdmin ||
    ((esPropietario || esSuSupervisor) && solicitud.estado === "PENDIENTE");

  if (!puedeEliminar) {
    return NextResponse.json(
      { error: "Solo puedes eliminar solicitudes pendientes de aprobación" },
      { status: 403 }
    );
  }

  await db.solicitudPasaje.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}