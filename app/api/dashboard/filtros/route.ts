// app/api/dashboard/filtros/route.ts
// Datos iniciales del Dashboard: empresas/sitios/áreas para sus combos de
// filtro y la alerta de pendientes. Se piden desde el cliente (en vez de
// bloquear la navegación esperando esto en el servidor, justo después del
// login) para que la pantalla se muestre de inmediato con su propia carga.

import { NextResponse } from "next/server";
import { db } from "../../../../lib/db";
import { getSession } from "../../../../lib/auth";
import { obtenerAlertaPendiente } from "../../../../lib/alertasPendientes";

export async function GET() {
  const session = await getSession();
  if (!session || !["ADMIN_TH", "COORDINADOR", "NOMINA", "JEFE", "SUPER_ADMIN"].includes(session.rol)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  // Listas completas (no acotadas al alcance del rol): el filtro es
  // opcional y el backend igual combina lo elegido aquí con el alcance
  // real del usuario, así que mostrar el árbol completo de la empresa
  // solo afecta qué opciones ve en el combo, no qué datos puede traer.
  const [empresas, sitios, areas, alerta] = await Promise.all([
    db.empresa.findMany({ select: { id: true, nombre: true }, orderBy: { nombre: "asc" } }),
    db.sitioProductivo.findMany({
      select: { id: true, nombre: true, empresaId: true },
      orderBy: { nombre: "asc" },
    }),
    db.area.findMany({ select: { id: true, nombre: true, sitioId: true }, orderBy: { nombre: "asc" } }),
    obtenerAlertaPendiente(session),
  ]);

  return NextResponse.json({ empresas, sitios, areas, alerta });
}
