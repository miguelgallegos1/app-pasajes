// app/api/th/historial/colaboradores/route.ts
// GET: total de rutas + valor por colaborador (Aprobadas + Revisadas + Pagadas) dentro
// del alcance de TH. Paginado por colaborador (vista "Por colaborador"
// del Historial de aprobaciones).

import { NextResponse } from "next/server";
import { filtroHistorial, respuestaPorColaborador } from "../../../../../lib/filtroHistorial";
import { getSession } from "../../../../../lib/auth";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session || !["ADMIN_TH", "SUPER_ADMIN"].includes(session.rol)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const resultado = await filtroHistorial(session, searchParams, { estados: ["APROBADA", "REVISADO", "PAGADA"], conAlcance: true });
  if ("error" in resultado) return resultado.error;
  const { filtro } = resultado;

  return respuestaPorColaborador(filtro, searchParams);
}
