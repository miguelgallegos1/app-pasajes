// app/api/admin/carga-masiva/colaboradores/plantilla/route.ts
// GET: plantilla .xlsx para la carga masiva de colaboradores, con una
// segunda hoja de referencia con los nombres EXACTOS de Empresa/Sitio/Área
// que ya existen (evita errores de tipeo al completar la primera hoja).

import { NextResponse } from "next/server";
import { getSession } from "../../../../../../lib/auth";
import { construirLibroExcelMultiHoja, nombreArchivoExcel } from "../../../../../../lib/exportarExcel";
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
      Apellidos: "PÉREZ GÓMEZ",
      Nombres: "JUAN CARLOS",
      "Código de nómina": "EMP-00123",
      "Es supervisor (SI/NO)": "NO",
      "PIN (opcional)": "",
    },
  ];

  const libro = construirLibroExcelMultiHoja([
    { nombre: "Colaboradores", filas: filasEjemplo },
    { nombre: "Áreas disponibles", filas: await obtenerFilasReferenciaAreas() },
  ]);

  return new NextResponse(new Uint8Array(libro), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${nombreArchivoExcel("plantilla-colaboradores")}"`,
    },
  });
}
