// app/api/auth/generar-pin/route.ts
// POST: propone un PIN de 6 dígitos aleatorio que todavía no está en uso,
// para no tener que escribir uno a mano y esperar a que "Guardar" avise
// que ya existe. Es solo una SUGERENCIA: al guardar el colaborador/usuario
// se vuelve a validar la unicidad de todas formas.

import { NextResponse } from "next/server";
import { randomInt } from "crypto";
import { db } from "../../../../lib/db";
import { getSession } from "../../../../lib/auth";
import { calcularPinLookup } from "../../../../lib/pin";

const INTENTOS_MAXIMOS = 20;

export async function POST() {
  const session = await getSession();
  if (!session || !["ADMIN_TH", "SUPER_ADMIN"].includes(session.rol)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  for (let intento = 0; intento < INTENTOS_MAXIMOS; intento++) {
    const pin = String(randomInt(0, 1_000_000)).padStart(6, "0");
    const pinLookup = calcularPinLookup(pin);
    const enUso = await db.usuario.findFirst({ where: { pinLookup }, select: { id: true } });
    if (!enUso) {
      return NextResponse.json({ pin });
    }
  }

  return NextResponse.json({ error: "No se pudo generar un PIN único, intenta de nuevo" }, { status: 500 });
}
