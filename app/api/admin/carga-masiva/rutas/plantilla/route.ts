// app/api/admin/carga-masiva/rutas/plantilla/route.ts
// GET: plantilla .xlsx para la carga masiva de rutas, con una segunda hoja
// de referencia con los nombres EXACTOS de Empresa/Sitio/Área existentes.

import { NextResponse } from "next/server";
import { getSession } from "../../../../../../lib/auth";
import { construirLibroExcelMultiHoja } from "../../../../../../lib/exportarExcel";
import { obtenerFilasReferenciaAreas } from "../../../../../../lib/areasLookup";

export async function GET() {
  const session = await getSession();
  if (!session || session.rol !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const filasEjemplo = [
    {
      Empresa: "EMPRESA EJEMPLO",
      Sitio: "SITIO EJEMPLO",
      Área: "ÁREA EJEMPLO",
      Ruta: "EL YAZNÁN - CAYAMBE - TABACUNDO",
      Valor: 0.9,
    },
  ];

  const libro = construirLibroExcelMultiHoja([
    { nombre: "Rutas", filas: filasEjemplo },
    { nombre: "Áreas disponibles", filas: await obtenerFilasReferenciaAreas() },
  ]);

  return new NextResponse(new Uint8Array(libro), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="plantilla-rutas.xlsx"`,
    },
  });
}
