// app/api/admin/asignaciones-th/route.ts
// POST: Super Admin crea una asignación de TH a Empresa/Sitio/Área.

import { NextResponse } from "next/server";
import { db } from "../../../../lib/db";
import { getSession } from "../../../../lib/auth";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.rol !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { usuarioId, empresaId, sitioId, areaId } = await req.json();

  if (!usuarioId || !empresaId) {
    return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
  }

  const usuario = await db.usuario.findUnique({ where: { id: usuarioId } });
  if (!usuario || !["ADMIN_TH", "COORDINADOR"].includes(usuario.rol)) {
    return NextResponse.json({ error: "Ese usuario no es de Talento Humano ni Coordinador" }, { status: 400 });
  }

  const empresa = await db.empresa.findUnique({ where: { id: empresaId } });
  if (!empresa) {
    return NextResponse.json({ error: "La empresa indicada no existe" }, { status: 400 });
  }

  // Se valida que sitio/área realmente existan y formen una jerarquía
  // consistente con la empresa indicada (evita asignaciones "sueltas" que
  // no calzan entre sí y que lib/alcanceTH.ts luego usaría para filtrar).
  if (areaId) {
    const area = await db.area.findUnique({
      where: { id: areaId },
      select: { sitioId: true, sitio: { select: { empresaId: true } } },
    });
    if (!area) {
      return NextResponse.json({ error: "El área indicada no existe" }, { status: 400 });
    }
    if (sitioId && area.sitioId !== sitioId) {
      return NextResponse.json({ error: "El área indicada no pertenece a ese sitio" }, { status: 400 });
    }
    if (area.sitio.empresaId !== empresaId) {
      return NextResponse.json({ error: "El área indicada no pertenece a esa empresa" }, { status: 400 });
    }
  } else if (sitioId) {
    const sitio = await db.sitioProductivo.findUnique({ where: { id: sitioId }, select: { empresaId: true } });
    if (!sitio) {
      return NextResponse.json({ error: "El sitio indicado no existe" }, { status: 400 });
    }
    if (sitio.empresaId !== empresaId) {
      return NextResponse.json({ error: "El sitio indicado no pertenece a esa empresa" }, { status: 400 });
    }
  }

  const asignacion = await db.asignacionTH.create({
    data: { usuarioId, empresaId, sitioId: sitioId || null, areaId: areaId || null },
  });

  return NextResponse.json(asignacion, { status: 201 });
}   