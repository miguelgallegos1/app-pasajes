// app/api/coordinador/historial/colaboradores/route.ts
// GET: total de rutas + valor por colaborador (Revisadas + Pagadas) dentro
// del alcance del Coordinador. Paginado por colaborador.

import { NextResponse } from "next/server";
import { filtroHistorial, respuestaPorColaborador } from "../../../../../lib/filtroHistorial";
import { getSession } from "../../../../../lib/auth";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session || !["COORDINADOR", "SUPER_ADMIN"].includes(session.rol)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const resultado = await filtroHistorial(session, searchParams, { estados: ["REVISADO", "PAGADA"], conAlcance: true });
  if ("error" in resultado) return resultado.error;
  const { filtro } = resultado;

  return respuestaPorColaborador(filtro, searchParams);
}
