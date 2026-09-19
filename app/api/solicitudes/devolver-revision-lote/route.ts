// app/api/solicitudes/devolver-revision-lote/route.ts
// POST: Coordinador o Nómina devuelven VARIAS solicitudes REVISADAs de
// vuelta a APROBADA a la vez (ver [id]/devolver-revision/route.ts). Cada
// una conserva su propia nota anterior, así que la actualización va fila
// por fila dentro de una transacción — no un solo updateMany.

import { NextResponse, after } from "next/server";
import { db } from "../../../../lib/db";
import { getSession } from "../../../../lib/auth";
import { obtenerCondicionRutaTH } from "../../../../lib/alcanceTH";
import { notificarCambioEstadoLote } from "../../../../lib/webPush";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || !["COORDINADOR", "NOMINA", "SUPER_ADMIN"].includes(session.rol)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { ids, motivo } = await req.json().catch(() => ({ ids: null, motivo: "" }));
  if (!Array.isArray(ids) || ids.length === 0 || !ids.every((v) => typeof v === "string")) {
    return NextResponse.json({ error: "No se enviaron solicitudes" }, { status: 400 });
  }
  if (!motivo || motivo.trim().length < 3) {
    return NextResponse.json({ error: "Indica el motivo de la corrección" }, { status: 400 });
  }

  // Nómina no tiene asignaciones por área (igual que en la ruta individual).
  const { sinRestriccion, condicion } =
    session.rol === "COORDINADOR"
      ? await obtenerCondicionRutaTH(session.id, session.rol)
      : { sinRestriccion: true as const, condicion: {} as Record<string, unknown> };
  if (condicion === null) {
    return NextResponse.json({ error: "No tienes áreas asignadas" }, { status: 403 });
  }

  const solicitudesValidas = await db.solicitudPasaje.findMany({
    where: {
      id: { in: ids },
      estado: "REVISADO",
      ...(sinRestriccion ? {} : { ruta: condicion }),
    },
    select: { id: true, observaciones: true },
  });

  if (solicitudesValidas.length === 0) {
    return NextResponse.json({ error: "Ninguna de las solicitudes es válida para devolver" }, { status: 400 });
  }

  const etiqueta = session.rol === "NOMINA" ? "NOVEDAD EN NÓMINA" : "DISCREPANCIA EN REVISIÓN";
  const motivoLimpio = motivo.trim().toUpperCase();
  const idsValidos = solicitudesValidas.map((s) => s.id);

  const resultados = await db.$transaction(
    solicitudesValidas.map((s) => {
      const notaExistente = s.observaciones ? `${s.observaciones} | ` : "";
      return db.solicitudPasaje.updateMany({
        where: { id: s.id, estado: "REVISADO" },
        data: {
          estado: "APROBADA",
          fechaRevision: null,
          revisadoPorId: null,
          observaciones: `${notaExistente}${etiqueta}: ${motivoLimpio}`,
        },
      });
    })
  );
  const count = resultados.reduce((acc, r) => acc + r.count, 0);

  after(async () => {
    const devueltas = await db.solicitudPasaje.findMany({
      where: { id: { in: idsValidos }, estado: "APROBADA" },
      select: { colaboradorId: true, estado: true },
    });
    await notificarCambioEstadoLote(devueltas);
  });

  return NextResponse.json({ devueltas: count });
}
