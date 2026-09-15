// app/api/th/rutas/eliminar-lote/route.ts
// POST: elimina VARIAS rutas a la vez, PERMANENTEMENTE. Solo Super Admin
// (a diferencia del resto del CRUD de rutas, que también permite TH dentro
// de su alcance) — borrar en bloque es más riesgoso que de a una, así que
// se restringe al rol de más confianza. Solo borra las que no tengan
// solicitudes registradas; el resto se ignora en silencio, igual que en
// aprobar-lote/revisar-lote/pagar-lote.

import { NextResponse } from "next/server";
import { db } from "../../../../../lib/db";
import { getSession } from "../../../../../lib/auth";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.rol !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { ids } = await req.json().catch(() => ({ ids: null }));
  if (!Array.isArray(ids) || ids.length === 0 || !ids.every((v) => typeof v === "string")) {
    return NextResponse.json({ error: "No se seleccionó ninguna ruta" }, { status: 400 });
  }

  const rutasElegibles = await db.ruta.findMany({
    where: { id: { in: ids }, solicitudes: { none: {} } },
    select: { id: true },
  });

  const idsElegibles = rutasElegibles.map((r) => r.id);
  if (idsElegibles.length === 0) {
    return NextResponse.json(
      { error: "Ninguna de las rutas elegidas se puede eliminar (todas tienen solicitudes registradas)" },
      { status: 400 }
    );
  }

  const resultado = await db.ruta.deleteMany({ where: { id: { in: idsElegibles } } });

  return NextResponse.json({ eliminadas: resultado.count, omitidas: ids.length - resultado.count });
}
