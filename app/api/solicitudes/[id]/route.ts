// app/api/solicitudes/[id]/route.ts
// PATCH: edita una solicitud mientras esté PENDIENTE o RECHAZADA
// (al guardar los cambios, vuelve a PENDIENTE para que TH la revise de nuevo).
// DELETE: el dueño (o su supervisor) elimina una solicitud PENDIENTE o RECHAZADA.

import { NextResponse } from "next/server";
import { db } from "../../../../lib/db";
import { getSession } from "../../../../lib/auth";
import { condicionRutasVisibles } from "../../../../lib/rutas";
import { fechaValida } from "../../../../lib/fechas";

async function obtenerPermiso(solicitudId: string, sessionId: string) {
  const solicitud = await db.solicitudPasaje.findUnique({
    where: { id: solicitudId },
    include: { colaborador: true },
  });
  if (!solicitud) return { solicitud: null, puede: false };

  const miColaborador = await db.colaborador.findUnique({ where: { usuarioId: sessionId } });
  const esPropietario = solicitud.colaborador.usuarioId === sessionId;
  const esSuSupervisor =
    !!miColaborador?.esSupervisor && solicitud.colaborador.supervisorId === miColaborador.id;

  return { solicitud, puede: esPropietario || esSuSupervisor };
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const { rutaId, fecha, observaciones } = await req.json().catch(() => ({}));

  if (!rutaId || !fecha) {
    return NextResponse.json(
      { error: "Faltan datos: ruta y fecha son obligatorios" },
      { status: 400 }
    );
  }
  const fechaEditada = fechaValida(fecha);
  if (!fechaEditada) {
    return NextResponse.json({ error: "La fecha indicada no es válida" }, { status: 400 });
  }

  const { solicitud, puede } = await obtenerPermiso(id, session.id);
  if (!solicitud) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

  const esSuperAdmin = session.rol === "SUPER_ADMIN";
  const puedeEditar = solicitud.estado === "PENDIENTE" || solicitud.estado === "RECHAZADA";
  if (!(puede || esSuperAdmin) || !puedeEditar) {
    return NextResponse.json(
      { error: "Solo puedes editar solicitudes pendientes o rechazadas" },
      { status: 403 }
    );
  }

  const ruta = await db.ruta.findFirst({
    where: { id: rutaId, ...condicionRutasVisibles(solicitud.colaborador) },
  });
  if (!ruta) {
    return NextResponse.json({ error: "Esa ruta no es válida para este colaborador" }, { status: 400 });
  }

  const actualizada = await db.solicitudPasaje.update({
    where: { id },
    data: {
      rutaId: ruta.id,
      fecha: fechaEditada,
      montoTotal: ruta.valor,
      observaciones: observaciones?.trim() ? observaciones.trim().toUpperCase() : null,
      estado: "PENDIENTE", // al corregirla, vuelve a la cola de aprobación
    },
  });

  return NextResponse.json(actualizada);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const { solicitud, puede } = await obtenerPermiso(id, session.id);
  if (!solicitud) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

  // El Super Admin puede eliminar una solicitud sin importar su estado
  // (control de errores). El dueño o su supervisor solo si sigue
  // Pendiente o Rechazada, igual que antes.
  const esSuperAdmin = session.rol === "SUPER_ADMIN";
  if (!esSuperAdmin) {
    const puedeEliminar = solicitud.estado === "PENDIENTE" || solicitud.estado === "RECHAZADA";
    if (!puede || !puedeEliminar) {
      return NextResponse.json(
        { error: "Solo puedes eliminar solicitudes pendientes o rechazadas" },
        { status: 403 }
      );
    }
  }

  await db.solicitudPasaje.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}