// app/api/solicitudes/route.ts
// POST: el colaborador logueado crea una nueva solicitud de pasajes.

import { NextResponse } from "next/server";
import { db } from "../../../lib/db";
import { getSession } from "../../../lib/auth";
import { calcularMonto } from "../../../lib/calculos";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { frecuencia, cantidadPasajes } = await req.json();

  const frecuenciasValidas = ["DIARIA", "SEMANAL", "MENSUAL", "ANUAL"];
  if (!frecuenciasValidas.includes(frecuencia)) {
    return NextResponse.json({ error: "Frecuencia inválida" }, { status: 400 });
  }

  const colaborador = await db.colaborador.findUnique({
    where: { usuarioId: session.id },
    include: { ruta: true },
  });

  if (!colaborador) {
    return NextResponse.json(
      { error: "No se encontró tu perfil de colaborador" },
      { status: 404 }
    );
  }

  const montoTotal = calcularMonto(
    Number(colaborador.ruta.montoBase),
    frecuencia,
    cantidadPasajes ?? 1
  );

  const solicitud = await db.solicitudPasaje.create({
    data: {
      colaboradorId: colaborador.id,
      frecuencia,
      cantidadPasajes: cantidadPasajes ?? 1,
      montoTotal,
      estado: "PENDIENTE",
    },
  });

  return NextResponse.json(solicitud, { status: 201 });
}