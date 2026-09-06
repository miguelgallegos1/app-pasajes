// app/api/colaboradores/route.ts
// POST: TH (o Super Admin) crea un colaborador nuevo dentro de SU alcance.
// Crea el Usuario (con PIN hasheado y único) y el perfil de Colaborador juntos.

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "../../../lib/db";
import { getSession } from "../../../lib/auth";
import { obtenerAreasPermitidasTH } from "../../../lib/alcanceTH";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || !["ADMIN_TH", "SUPER_ADMIN"].includes(session.rol)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { nombreCompleto, areaId, pin, esSupervisor, supervisorId } = await req.json();

  if (!nombreCompleto || !areaId || !pin) {
    return NextResponse.json({ error: "Faltan datos obligatorios" }, { status: 400 });
  }
  if (!/^\d{6}$/.test(pin)) {
    return NextResponse.json({ error: "El PIN debe tener exactamente 6 dígitos" }, { status: 400 });
  }

  // El área elegida debe estar dentro del alcance de este TH
  const areasPermitidas = await obtenerAreasPermitidasTH(session.id, session.rol);
  const area = areasPermitidas.find((a) => a.id === areaId);
  if (!area) {
    return NextResponse.json({ error: "Esa área no está en tu alcance" }, { status: 403 });
  }

  // El PIN debe ser único en TODO el sistema (se compara contra cada hash)
  const usuarios = await db.usuario.findMany({ select: { pinHash: true } });
  for (const u of usuarios) {
    if (await bcrypt.compare(pin, u.pinHash)) {
      return NextResponse.json({ error: "Ese PIN ya está en uso, elige otro" }, { status: 400 });
    }
  }

  const pinHash = await bcrypt.hash(pin, 10);

  const nuevo = await db.usuario.create({
    data: {
      nombre: nombreCompleto,
      pinHash,
      rol: "COLABORADOR",
      colaborador: {
        create: {
          nombreCompleto,
          sitioId: area.sitioId,
          areaId: area.id,
          esSupervisor: !!esSupervisor,
          supervisorId: supervisorId || null,
        },
      },
    },
    include: { colaborador: true },
  });

  return NextResponse.json(nuevo, { status: 201 });
}