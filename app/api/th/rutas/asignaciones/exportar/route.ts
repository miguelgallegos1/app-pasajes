// app/api/th/rutas/asignaciones/exportar/route.ts
// GET: exporta a Excel, dentro del alcance de TH, qué rutas tiene
// exclusivas cada colaborador — mismos filtros de Empresa/Sitio/Área y
// Estado (activos por defecto) que la pantalla de Asignar rutas. Sin ningún filtro,
// exporta TODO lo que tiene asignado ese TH (todas sus Empresas/Sitios/
// Áreas); con un filtro puesto, exporta solo eso — nunca más de lo que el
// alcance de TH permite, sea cual sea el filtro.

import { NextResponse } from "next/server";
import { db } from "../../../../../../lib/db";
import { getSession } from "../../../../../../lib/auth";
import { obtenerCondicionColaboradorTH } from "../../../../../../lib/alcanceTH";
import { construirLibroExcel, limitarFilasExportacion } from "../../../../../../lib/exportarExcel";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session || !["ADMIN_TH", "SUPER_ADMIN"].includes(session.rol)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const empresaId = searchParams.get("empresaId");
  const sitioId = searchParams.get("sitioId");
  const areaId = searchParams.get("areaId");
  // Mismo filtro de Estado que la pantalla: ACTIVO por defecto, INACTIVO
  // o TODOS.
  const estadoParam = searchParams.get("estado") ?? "ACTIVO";

  const { sinRestriccion, condicion } = await obtenerCondicionColaboradorTH(session.id, session.rol);
  if (!sinRestriccion && !condicion) {
    return NextResponse.json({ error: "No tienes ninguna Empresa/Sitio/Área asignada" }, { status: 403 });
  }

  // Sin filtro, queda tal cual el alcance de TH (todo lo que tiene
  // asignado); con un filtro puesto, se lo agrega AL alcance (nunca lo
  // reemplaza), así nunca se puede exportar más de lo permitido.
  const filtro: Record<string, unknown> = sinRestriccion ? {} : { ...(condicion as object) };
  if (areaId) filtro.areaId = areaId;
  else if (sitioId) filtro.sitioId = sitioId;
  else if (empresaId) filtro.sitio = { empresaId };
  if (estadoParam === "ACTIVO" || estadoParam === "INACTIVO") filtro.estado = estadoParam;

  const colaboradores = await db.colaborador.findMany({
    where: filtro,
    select: {
      nombreCompleto: true,
      esSupervisor: true,
      area: {
        select: { nombre: true, sitio: { select: { nombre: true, empresa: { select: { nombre: true } } } } },
      },
      rutasExclusivas: { where: { activo: true }, select: { nombre: true }, orderBy: { nombre: "asc" } },
    },
    orderBy: { numero: "asc" },
  });

  const { filas, truncado } = limitarFilasExportacion(
    colaboradores.map((c) => ({
      Empresa: c.area.sitio.empresa.nombre,
      Sitio: c.area.sitio.nombre,
      Área: c.area.nombre,
      Colaborador: c.nombreCompleto,
      "Es supervisor": c.esSupervisor ? "Sí" : "No",
      "Rutas asignadas": c.rutasExclusivas.map((r) => r.nombre).join(", ") || "Ninguna",
    }))
  );
  // El tope de filas protege al servidor, pero si se aplicó hay que
  // avisarlo dentro del propio Excel (el archivo se descarga con un link
  // directo, no hay forma de mostrar un aviso en pantalla).
  if (truncado) {
    filas.push({
      Empresa: "Exportación limitada a 5000 filas. Filtra por Empresa/Sitio/Área para ver el resto.",
      Sitio: "",
      Área: "",
      Colaborador: "",
      "Es supervisor": "",
      "Rutas asignadas": "",
    });
  }

  const libro = construirLibroExcel(filas, "Asignación de rutas");
  return new NextResponse(new Uint8Array(libro), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="asignacion-rutas.xlsx"`,
    },
  });
}
