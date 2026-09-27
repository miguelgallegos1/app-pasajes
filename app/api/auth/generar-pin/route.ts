// app/api/auth/generar-pin/route.ts
// POST: genera un PIN de 6 dígitos aleatorio que todavía no está en uso,
// junto con su firma (lib/pinFirmado.ts): al guardar un colaborador, el
// servidor solo acepta PINs generados acá. Igual se vuelve a validar la
// unicidad al guardar (pudo tomarlo otro mientras tanto).

import { NextResponse } from "next/server";
import { randomInt } from "crypto";
import { db } from "../../../../lib/db";
import { getSession } from "../../../../lib/auth";
import { calcularPinLookup } from "../../../../lib/pin";
import { firmarPin } from "../../../../lib/pinFirmado";

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
      return NextResponse.json({ pin, firma: await firmarPin(pin, session.id) });
    }
  }

  return NextResponse.json({ error: "No se pudo generar un PIN único, intenta de nuevo" }, { status: 500 });
}
