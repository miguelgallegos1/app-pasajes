// app/api/colaboradores/[id]/route.ts
// PATCH: edita nombre/área/supervisor/estado de un colaborador.
// DELETE: elimina PERMANENTEMENTE, solo si no tiene solicitudes ni
// gente a su cargo (para no romper el historial ni dejar huérfanos).

import { NextResponse } from "next/server";
import { db } from "../../../../lib/db";
import { getSession } from "../../../../lib/auth";
import { obtenerAreasPermitidasTH } from "../../../../lib/alcanceTH";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || !["ADMIN_TH", "SUPER_ADMIN"].includes(session.rol)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id } = await params;
  const { nombreCompleto, areaId, esSupervisor, supervisorId, estado } = await req.json();

  const colaborador = await db.colaborador.findUnique({ where: { id } });
  if (!colaborador) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const areasPermitidas = await obtenerAreasPermitidasTH(session.id, session.rol);
  const idsPermitidos = new Set(areasPermitidas.map((a) => a.id));

  if (!idsPermitidos.has(colaborador.areaId)) {
    return NextResponse.json({ error: "Ese colaborador no está en tu alcance" }, { status: 403 });
  }

  const data: Record<string, unknown> = {};
  if (nombreCompleto) data.nombreCompleto = nombreCompleto;
  if (typeof esSupervisor === "boolean") data.esSupervisor = esSupervisor;
  if (supervisorId !== undefined) data.supervisorId = supervisorId || null;
  if (estado === "ACTIVO" || estado === "INACTIVO") data.estado = estado;

  if (areaId && areaId !== colaborador.areaId) {
    const nuevaArea = areasPermitidas.find((a) => a.id === areaId);
    if (!nuevaArea) {
      return NextResponse.json({ error: "Esa área no está en tu alcance" }, { status: 403 });
    }
    data.areaId = nuevaArea.id;
    data.sitioId = nuevaArea.sitioId;
  }

  const actualizado = await db.colaborador.update({ where: { id }, data });
  return NextResponse.json(actualizado);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || !["ADMIN_TH", "SUPER_ADMIN"].includes(session.rol)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id } = await params;

  const colaborador = await db.colaborador.findUnique({
    where: { id },
    include: { _count: { select: { solicitudes: true } } },
  });
  if (!colaborador) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const areasPermitidas = await obtenerAreasPermitidasTH(session.id, session.rol);
  if (!areasPermitidas.some((a) => a.id === colaborador.areaId)) {
    return NextResponse.json({ error: "Ese colaborador no está en tu alcance" }, { status: 403 });
  }

  if (colaborador._count.solicitudes > 0) {
    return NextResponse.json(
      { error: "No se puede eliminar: tiene solicitudes registradas. Solo puedes desactivarlo." },
      { status: 400 }
    );
  }

  const tieneEquipo = await db.colaborador.count({ where: { supervisorId: id } });
  if (tieneEquipo > 0) {
    return NextResponse.json(
      { error: "No se puede eliminar: tiene colaboradores a su cargo. Reasígnalos primero." },
      { status: 400 }
    );
  }

  await db.colaborador.delete({ where: { id } });
  await db.usuario.delete({ where: { id: colaborador.usuarioId } });

  return NextResponse.json({ ok: true });
}