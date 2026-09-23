// app/api/dashboard/filtros/route.ts
// Datos iniciales del Dashboard: empresas/sitios/áreas para sus combos de
// filtro. Se piden desde el cliente (en vez de bloquear la navegación
// esperando esto en el servidor, justo después del login) para que la
// pantalla se muestre de inmediato con su propia carga.
//
// La alerta de pendientes ya NO se pide acá — vivía duplicada con la
// campanita del header (NotificacionesMenu, que consulta
// /api/dashboard/pendientes-accion), mostrando lo mismo dos veces.

import { NextResponse } from "next/server";
import { db } from "../../../../lib/db";
import { getSession } from "../../../../lib/auth";
import { obtenerAreasPermitidasTH } from "../../../../lib/alcanceTH";

export async function GET() {
  const session = await getSession();
  if (!session || !["ADMIN_TH", "COORDINADOR", "NOMINA", "JEFE", "SUPER_ADMIN"].includes(session.rol)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  // Nómina y Jefe no tienen asignaciones por área (igual que en
  // /api/dashboard/kpis), así que ven el árbol completo. Para Talento
  // Humano y Coordinador el combo se acota a su alcance real — antes
  // mostraba SIEMPRE el árbol completo de la empresa (confiando en que
  // /api/dashboard/kpis igual limitaba los datos reales), lo que exponía
  // nombres de empresas/sitios/áreas fuera de su asignación.
  if (session.rol === "ADMIN_TH" || session.rol === "COORDINADOR") {
    const areasPermitidas = await obtenerAreasPermitidasTH(session.id, session.rol);
    const empresasMapa = new Map<string, { id: string; nombre: string }>();
    const sitiosMapa = new Map<string, { id: string; nombre: string; empresaId: string }>();
    const areasMapa = new Map<string, { id: string; nombre: string; sitioId: string }>();
    for (const a of areasPermitidas) {
      empresasMapa.set(a.sitio.empresa.id, { id: a.sitio.empresa.id, nombre: a.sitio.empresa.nombre });
      sitiosMapa.set(a.sitioId, { id: a.sitioId, nombre: a.sitio.nombre, empresaId: a.sitio.empresa.id });
      areasMapa.set(a.id, { id: a.id, nombre: a.nombre, sitioId: a.sitioId });
    }
    return NextResponse.json({
      empresas: Array.from(empresasMapa.values()).sort((a, b) => a.nombre.localeCompare(b.nombre)),
      sitios: Array.from(sitiosMapa.values()).sort((a, b) => a.nombre.localeCompare(b.nombre)),
      areas: Array.from(areasMapa.values()).sort((a, b) => a.nombre.localeCompare(b.nombre)),
    });
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
