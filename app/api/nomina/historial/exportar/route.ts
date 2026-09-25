// app/api/nomina/historial/exportar/route.ts
// GET: exporta a Excel lo PAGADO cuyo pasaje cae en el rango, con los
// mismos filtros que la pantalla (empresa/sitio/área/colaborador),
// CONSOLIDADO: una fila por colaborador con su valor total, sin rutas —
// es lo que Nómina necesita para cargar el pago. La suma se hace en la
// base de datos (groupBy), no trayendo cada solicitud.

import { NextResponse } from "next/server";
import { db } from "../../../../../lib/db";
import { getSession } from "../../../../../lib/auth";
import { fechaValida } from "../../../../../lib/fechas";
import { construirLibroExcel, nombreArchivoExcel } from "../../../../../lib/exportarExcel";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session || !["NOMINA", "SUPER_ADMIN"].includes(session.rol)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const desde = searchParams.get("desde");
  const hasta = searchParams.get("hasta");
  const empresaId = searchParams.get("empresaId");
  const sitioId = searchParams.get("sitioId");
  const areaId = searchParams.get("areaId");
  const colaboradorId = searchParams.get("colaboradorId");

  if (!desde || !hasta) {
    return NextResponse.json({ error: "Debes indicar un rango de fechas" }, { status: 400 });
  }
  const desdeFecha = fechaValida(desde);
  const hastaFecha = fechaValida(hasta);
  if (!desdeFecha || !hastaFecha) {
    return NextResponse.json({ error: "Rango de fechas inválido" }, { status: 400 });
  }

  const filtro: Record<string, unknown> = {
    estado: "PAGADA",
    fecha: { gte: desdeFecha, lte: hastaFecha },
  };
  if (colaboradorId) filtro.colaboradorId = colaboradorId;
  else if (areaId) filtro.ruta = { areaId };
  else if (sitioId) filtro.ruta = { sitioId };
  else if (empresaId) filtro.ruta = { empresaId };

  const grupos = await db.solicitudPasaje.groupBy({
    by: ["colaboradorId"],
    where: filtro,
    _sum: { montoTotal: true },
    _count: true,
  });
  const colaboradores = grupos.length
    ? await db.colaborador.findMany({
        where: { id: { in: grupos.map((g) => g.colaboradorId) } },
        select: {
          id: true,
          nombreCompleto: true,
          codigoNomina: true,
          area: { select: { nombre: true, sitio: { select: { nombre: true, empresa: { select: { nombre: true } } } } } },
        },
      })
    : [];
  const colaboradorPorId = new Map(colaboradores.map((c) => [c.id, c]));

  // Empresa/Sitio/Área son los del colaborador (sus rutas pagadas pueden
  // ser de más de un área, y acá ya no hay detalle por ruta).
  const filas = grupos
    .map((g) => {
      const c = colaboradorPorId.get(g.colaboradorId);
      return {
        Empresa: c?.area.sitio.empresa.nombre ?? "",
        Sitio: c?.area.sitio.nombre ?? "",
        Área: c?.area.nombre ?? "",
        "Código colaborador": c?.codigoNomina ?? "",
        Colaborador: c?.nombreCompleto ?? "Desconocido",
        Pasajes: g._count,
        Valor: Number(g._sum.montoTotal ?? 0),
      };
    })
    .sort((a, b) => a.Colaborador.localeCompare(b.Colaborador));
  filas.push({
    Empresa: "TOTAL",
    Sitio: "",
    Área: "",
    "Código colaborador": "",
    Colaborador: "",
    Pasajes: grupos.reduce((acc, g) => acc + g._count, 0),
    // Redondeo a centavos: sumar decimales en coma flotante deja colas (…0000001).
    Valor: Math.round(grupos.reduce((acc, g) => acc + Number(g._sum.montoTotal ?? 0), 0) * 100) / 100,
  });

  const libro = construirLibroExcel(filas, "Historial de pagos");
  return new NextResponse(new Uint8Array(libro), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${nombreArchivoExcel(`historial-pagos-${desde}_a_${hasta}`)}"`,
    },
  });
}
