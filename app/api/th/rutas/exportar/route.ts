// app/api/th/rutas/exportar/route.ts
// GET: exporta a Excel las rutas creadas, dentro del alcance de TH, indicando
// si cada una está asignada al menos a un colaborador — para detectar rutas
// basura (creadas y nunca asignadas, o asignadas solo a colaboradores
// inactivos). Mismos filtros que la pantalla de Rutas: Empresa/Sitio/Área,
// Estado (activas por defecto) y búsqueda. Nunca exporta más de lo que el
// alcance de TH permite, sea cual sea el filtro.

import { NextResponse } from "next/server";
import { db } from "../../../../../lib/db";
import { getSession } from "../../../../../lib/auth";
import { obtenerAreasPermitidasTH } from "../../../../../lib/alcanceTH";
import { formatearFecha } from "../../../../../lib/fechas";
import { construirLibroExcel, limitarFilasExportacion, nombreArchivoExcel } from "../../../../../lib/exportarExcel";

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
  const texto = (searchParams.get("q") ?? "").trim().toLowerCase();

  const areasPermitidas = await obtenerAreasPermitidasTH(session.id, session.rol);
  if (areasPermitidas.length === 0) {
    return NextResponse.json({ error: "No tienes ninguna Empresa/Sitio/Área asignada" }, { status: 403 });
  }

  // El filtro se agrega AL alcance (nunca lo reemplaza).
  const filtro: Record<string, unknown> = { areaId: { in: areasPermitidas.map((a) => a.id) } };
  if (areaId) filtro.AND = [{ areaId }];
  else if (sitioId) filtro.sitioId = sitioId;
  else if (empresaId) filtro.empresaId = empresaId;
  if (estadoParam === "ACTIVO" || estadoParam === "INACTIVO") filtro.activo = estadoParam === "ACTIVO";

  const rutas = await db.ruta.findMany({
    where: filtro,
    select: {
      numero: true,
      nombre: true,
      valor: true,
      activo: true,
      createdAt: true,
      area: {
        select: { nombre: true, sitio: { select: { nombre: true, empresa: { select: { nombre: true } } } } },
      },
      colaboradoresExclusivos: {
        select: { nombreCompleto: true, codigoNomina: true, estado: true },
        orderBy: { nombreCompleto: "asc" },
      },
      _count: { select: { solicitudes: true } },
    },
  });

  const filasCompletas = rutas
    .map((r) => {
      const areaLabel = `${r.area.sitio.empresa.nombre} · ${r.area.sitio.nombre} · ${r.area.nombre}`;
      const activos = r.colaboradoresExclusivos.filter((c) => c.estado === "ACTIVO");
      const asignacion = activos.length > 0 ? "Sí" : r.colaboradoresExclusivos.length > 0 ? "Solo a inactivos" : "No";
      return {
        coincide: !texto || r.nombre.toLowerCase().includes(texto) || areaLabel.toLowerCase().includes(texto),
        fila: {
          "N°": r.numero,
          Empresa: r.area.sitio.empresa.nombre,
          Sitio: r.area.sitio.nombre,
          Área: r.area.nombre,
          Ruta: r.nombre,
          Valor: Number(r.valor),
          Estado: r.activo ? "Activa" : "Inactiva",
          "¿Asignada?": asignacion,
          "Colaboradores activos asignados": activos.length,
          "Colaboradores asignados": r.colaboradoresExclusivos
            .map((c) => `${c.codigoNomina ? `${c.codigoNomina} ` : ""}${c.nombreCompleto}${c.estado === "ACTIVO" ? "" : " (inactivo)"}`)
            .join(", "),
          "Pasajes registrados": r._count.solicitudes,
          Creada: formatearFecha(r.createdAt),
        },
      };
    })
    .filter((x) => x.coincide)
    .map((x) => x.fila);

  // Primero las que no están asignadas (las candidatas a basura), luego por
  // ubicación y nombre.
  const prioridad = { No: 0, "Solo a inactivos": 1, Sí: 2 } as const;
  filasCompletas.sort(
    (a, b) =>
      prioridad[a["¿Asignada?"] as keyof typeof prioridad] - prioridad[b["¿Asignada?"] as keyof typeof prioridad] ||
      a.Empresa.localeCompare(b.Empresa) ||
      a.Sitio.localeCompare(b.Sitio) ||
      a.Área.localeCompare(b.Área) ||
      a.Ruta.localeCompare(b.Ruta)
  );

  const { filas, truncado } = limitarFilasExportacion(filasCompletas);
  // Si se aplicó el tope, se avisa dentro del propio Excel (el archivo se
  // descarga con un link directo, sin aviso en pantalla).
  if (truncado) {
    filas.push({
      "N°": 0,
      Empresa: "Exportación limitada a 5000 filas. Filtra por Empresa/Sitio/Área para ver el resto.",
      Sitio: "",
      Área: "",
      Ruta: "",
      Valor: 0,
      Estado: "",
      "¿Asignada?": "",
      "Colaboradores activos asignados": 0,
      "Colaboradores asignados": "",
      "Pasajes registrados": 0,
      Creada: "",
    });
  }

  const libro = construirLibroExcel(filas, "Rutas");
  return new NextResponse(new Uint8Array(libro), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${nombreArchivoExcel("rutas")}"`,
    },
  });
}
