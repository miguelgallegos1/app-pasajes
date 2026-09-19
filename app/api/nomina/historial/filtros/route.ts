// app/api/nomina/historial/filtros/route.ts
// GET: Empresa/Sitio/Área para poblar los combos del historial de Nómina.
// Se piden desde el cliente (no bloquean el render inicial de la
// pantalla) porque Nómina no tiene alcance restringido — ve toda la
// estructura de la empresa igual que antes, solo que ya no hace esperar
// la pantalla completa a que esta consulta termine.

import { NextResponse } from "next/server";
import { db } from "../../../../../lib/db";
import { getSession } from "../../../../../lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session || !["NOMINA", "SUPER_ADMIN"].includes(session.rol)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const [empresas, sitios, areas] = await Promise.all([
    db.empresa.findMany({ select: { id: true, nombre: true }, orderBy: { nombre: "asc" } }),
    db.sitioProductivo.findMany({
      select: { id: true, nombre: true, empresaId: true },
      orderBy: { nombre: "asc" },
    }),
    db.area.findMany({ select: { id: true, nombre: true, sitioId: true }, orderBy: { nombre: "asc" } }),
  ]);

  return NextResponse.json({ empresas, sitios, areas });
}
