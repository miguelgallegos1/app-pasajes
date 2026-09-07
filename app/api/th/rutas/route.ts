// app/api/th/rutas/route.ts
// POST: crea una nueva Ruta (con su propio nombre) dentro de un Área.
// Una misma Área puede tener MUCHAS rutas distintas.

import { NextResponse } from "next/server";
import { db } from "../../../../lib/db";
import { getSession } from "../../../../lib/auth";
import { obtenerAreasPermitidasTH } from "../../../../lib/alcanceTH";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || !["ADMIN_TH", "SUPER_ADMIN"].includes(session.rol)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { areaId, nombre, valor } = await req.json();

  if (!areaId || !nombre?.trim() || valor === undefined || Number(valor) <= 0) {
    return NextResponse.json({ error: "Nombre, área y valor (mayor a 0) son obligatorios" }, { status: 400 });
  }

  const areasPermitidas = await obtenerAreasPermitidasTH(session.id, session.rol);
  if (!areasPermitidas.some((a) => a.id === areaId)) {
    return NextResponse.json({ error: "Esa área no está en tu alcance" }, { status: 403 });
  }

  const area = await db.area.findUnique({ where: { id: areaId }, include: { sitio: true } });
  if (!area) return NextResponse.json({ error: "Área no encontrada" }, { status: 404 });

  try {
    const ruta = await db.ruta.create({
      data: {
        nombre: nombre.trim().toUpperCase(),
        empresaId: area.sitio.empresaId,
        sitioId: area.sitioId,
        areaId: area.id,
        valor: Number(valor),
      },
    });
    return NextResponse.json(ruta, { status: 201 });
  } catch (e: any) {
    if (e.code === "P2002") {
      return NextResponse.json({ error: "Ya existe una ruta con ese nombre en esa área" }, { status: 400 });
    }
    throw e;
  }
}