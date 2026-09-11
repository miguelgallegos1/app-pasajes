// app/api/solicitudes/[id]/revisar/route.ts
// PATCH: Coordinador (o Super Admin) marca como revisada una solicitud
// aprobada, paso intermedio antes de que Nómina la pague.

import { NextResponse } from "next/server";
import { db } from "../../../../../lib/db";
import { getSession } from "../../../../../lib/auth";
import { obtenerCondicionRutaTH } from "../../../../../lib/alcanceTH";

export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || !["COORDINADOR", "SUPER_ADMIN"].includes(session.rol)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id } = await params;

  // Un Coordinador con áreas asignadas solo puede revisar solicitudes de
  // rutas dentro de su alcance (mismo mecanismo que Talento Humano).
  const { sinRestriccion, condicion } = await obtenerCondicionRutaTH(session.id, session.rol);
  if (condicion === null) {
    return NextResponse.json({ error: "No tienes áreas asignadas" }, { status: 403 });
  }
  const enAlcance = await db.solicitudPasaje.findFirst({
    where: { id, ...(sinRestriccion ? {} : { ruta: condicion }) },
    select: { id: true },
  });
  if (!enAlcance) {
    return NextResponse.json(
      { error: "Solo se pueden revisar solicitudes aprobadas" },
      { status: 400 }
    );
  }

  // El estado se exige dentro del propio WHERE del UPDATE para que la
  // condición se verifique de forma atómica (ver aprobar/route.ts).
  const resultado = await db.solicitudPasaje.updateMany({
    where: { id, estado: "APROBADA" },
    data: {
      estado: "REVISADO",
      fechaRevision: new Date(),
      revisadoPorId: session.id,
    },
  });

  if (resultado.count === 0) {
    return NextResponse.json(
      { error: "Solo se pueden revisar solicitudes aprobadas" },
      { status: 400 }
    );
  }

  const actualizada = await db.solicitudPasaje.findUnique({ where: { id } });
  return NextResponse.json(actualizada);
}
