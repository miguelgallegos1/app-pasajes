// app/api/solicitudes/por-dia/route.ts
// GET: solicitudes de UN día puntual (propias, o del equipo si es
// supervisor), en CUALQUIER estado — a diferencia de "Mis Pasajes" (que
// solo muestra Pendiente/Aprobada/Rechazada) o el historial (Aprobada/
// Pagada). Se usa para elegir qué rutas copiar a otro día, sin importar
// en qué estado quedó la solicitud original.

import { NextResponse } from "next/server";
import { db } from "../../../../lib/db";
import { getSession } from "../../../../lib/auth";
import { fechaValida } from "../../../../lib/fechas";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const fecha = searchParams.get("fecha");
  if (!fecha) return NextResponse.json({ error: "Debes indicar una fecha" }, { status: 400 });
  const fechaBuscada = fechaValida(fecha);
  if (!fechaBuscada) return NextResponse.json({ error: "Fecha inválida" }, { status: 400 });

  const miColaborador = await db.colaborador.findUnique({ where: { usuarioId: session.id } });
  if (!miColaborador) return NextResponse.json({ error: "Colaborador no encontrado" }, { status: 404 });

  const equipo = miColaborador.esSupervisor
    ? await db.colaborador.findMany({
        where: { supervisorId: miColaborador.id, estado: "ACTIVO" },
        select: { id: true },
      })
    : [];
  const idsPermitidos = [miColaborador.id, ...equipo.map((c) => c.id)];

  const inicioDia = new Date(Date.UTC(fechaBuscada.getUTCFullYear(), fechaBuscada.getUTCMonth(), fechaBuscada.getUTCDate()));
  const finDia = new Date(Date.UTC(fechaBuscada.getUTCFullYear(), fechaBuscada.getUTCMonth(), fechaBuscada.getUTCDate(), 23, 59, 59, 999));

  const solicitudes = await db.solicitudPasaje.findMany({
    where: {
      colaboradorId: { in: idsPermitidos },
      fecha: { gte: inicioDia, lte: finDia },
    },
    orderBy: { fechaSolicitud: "asc" },
    include: {
      ruta: { select: { nombre: true, valor: true } },
      colaborador: { select: { nombreCompleto: true } },
    },
  });

  return NextResponse.json(
    solicitudes.map((s) => ({
      id: s.id,
      colaboradorId: s.colaboradorId,
      nombreColaborador: s.colaborador.nombreCompleto,
      rutaId: s.rutaId,
      rutaLabel: s.ruta.nombre,
      valor: Number(s.ruta.valor),
      estado: s.estado,
    }))
  );
}
