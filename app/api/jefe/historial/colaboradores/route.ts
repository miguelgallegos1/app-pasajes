// app/api/jefe/historial/colaboradores/route.ts
// GET: total de rutas + valor por colaborador (cualquier estado, o el que
// se filtre) dentro del rango y filtros de la cascada Empresa/Sitio/Área.
// Paginado por colaborador — la agregación se hace en la base de datos.

import { NextResponse } from "next/server";
import { filtroHistorial, respuestaPorColaborador } from "../../../../../lib/filtroHistorial";
import { getSession } from "../../../../../lib/auth";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session || !["JEFE", "SUPER_ADMIN"].includes(session.rol)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const resultado = await filtroHistorial(session, searchParams, { estados: ["PENDIENTE", "APROBADA", "RECHAZADA", "REVISADO", "PAGADA"], conAlcance: false });
  if ("error" in resultado) return resultado.error;
  const { filtro } = resultado;

  return respuestaPorColaborador(filtro, searchParams);
}
