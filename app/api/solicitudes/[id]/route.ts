// app/api/solicitudes/[id]/route.ts
// PATCH: edita una solicitud mientras esté PENDIENTE o RECHAZADA
// (al guardar los cambios, vuelve a PENDIENTE para que TH la revise de nuevo).
// DELETE: el dueño (o su supervisor, o el usuario administrativo con esa
// ficha vinculada) elimina una solicitud PENDIENTE o RECHAZADA.

import { NextResponse } from "next/server";
import { db } from "../../../../lib/db";
import { getSession, obtenerFichaPropiaId, type SesionUsuario } from "../../../../lib/auth";
import { condicionRutasVisibles } from "../../../../lib/rutas";
import { fechaValida } from "../../../../lib/fechas";
import { errorFechaSolicitud } from "../../../../lib/parametros";

async function obtenerPermiso(solicitudId: string, sesion: SesionUsuario) {
  const sessionId = sesion.id;
  const solicitud = await db.solicitudPasaje.findUnique({
    where: { id: solicitudId },
    include: { colaborador: true },
  });
  if (!solicitud) return { solicitud: null, puede: false };

  const miColaborador = await db.colaborador.findUnique({ where: { usuarioId: sessionId } });
  const esPropietario = solicitud.colaborador.usuarioId === sessionId;
  const esSuSupervisor =
    !!miColaborador?.esSupervisor && solicitud.colaborador.supervisorId === miColaborador.id;

  // Usuario administrativo (ej. TH) con su ficha vinculada: gestiona las
  // solicitudes de SU ficha como si fuera el dueño (no las de otros).
  const esFichaPropia = (await obtenerFichaPropiaId(sesion)) === solicitud.colaboradorId;

  return { solicitud, puede: esPropietario || esSuSupervisor || esFichaPropia };
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

  const { solicitud, puede } = await obtenerPermiso(id, session);
  if (!solicitud) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

  // La regla de "días atrás" solo si se CAMBIA la fecha: corregir una
  // rechazada vieja manteniendo su fecha original no debe bloquearse.
  if (fechaEditada.getTime() !== solicitud.fecha.getTime()) {
    const errorFecha = await errorFechaSolicitud(fechaEditada);
    if (errorFecha) return NextResponse.json({ error: errorFecha }, { status: 400 });
  }

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

  // Atómico: el estado se vuelve a exigir en el WHERE. Si TH la aprobó
  // entre la lectura de arriba y esta escritura, no se toca (antes la
  // devolvía a PENDIENTE pisando la aprobación).
  const resultado = await db.solicitudPasaje.updateMany({
    where: { id, estado: { in: ["PENDIENTE", "RECHAZADA"] } },
    data: {
      rutaId: ruta.id,
      fecha: fechaEditada,
      montoTotal: ruta.valor,
      observaciones: typeof observaciones === "string" && observaciones.trim() ? observaciones.trim().toUpperCase() : null,
      estado: "PENDIENTE", // al corregirla, vuelve a la cola de aprobación
    },
  });
  if (resultado.count === 0) {
    return NextResponse.json({ error: "La solicitud cambió de estado mientras la editabas; recarga la pantalla" }, { status: 409 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const { solicitud, puede } = await obtenerPermiso(id, session);
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

  // Atómico: quien no es Super Admin solo borra si SIGUE Pendiente o
  // Rechazada (pudo aprobarse entre la lectura y esta escritura).
  // deleteMany además no falla si otro ya la borró.
  const resultado = await db.solicitudPasaje.deleteMany({
    where: { id, ...(esSuperAdmin ? {} : { estado: { in: ["PENDIENTE", "RECHAZADA"] } }) },
  });
  if (resultado.count === 0) {
    return NextResponse.json({ error: "La solicitud ya no se puede eliminar (cambió de estado o ya no existe)" }, { status: 409 });
  }
  return NextResponse.json({ ok: true });
}