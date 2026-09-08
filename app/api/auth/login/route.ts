// app/api/auth/login/route.ts
// Endpoint que valida el PIN (el PIN por sí solo identifica al usuario).
// Si el usuario es un Colaborador SIN rol de Supervisor y YA tiene un
// supervisor asignado, se bloquea su acceso: sus pasajes ahora los
// registra el supervisor, no él directamente.

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "../../../../lib/db";
import { establecerCookieSesion, verificarAccesoColaborador } from "../../../../lib/auth";
import { calcularPinLookup } from "../../../../lib/pin";

export async function POST(req: Request) {
  const { pin } = await req.json();

  if (!pin || pin.length !== 6) {
    return NextResponse.json(
      { error: "El PIN debe tener 6 dígitos" },
      { status: 400 }
    );
  }

  const pinLookup = calcularPinLookup(pin);

  // Camino rápido: la huella del PIN ya identifica al candidato con una
  // consulta indexada (sin comparar con bcrypt contra todos los usuarios).
  let usuarioEncontrado = await db.usuario.findFirst({ where: { pinLookup, activo: true } });
  if (usuarioEncontrado && !(await bcrypt.compare(pin, usuarioEncontrado.pinHash))) {
    usuarioEncontrado = null; // huella improbable pero no confiamos ciegamente en ella
  }

  if (!usuarioEncontrado) {
    // Camino de respaldo: solo para cuentas creadas antes de este cambio,
    // que todavía no tienen su huella calculada. Se migran solas al
    // encontrarlas, así que esto se vuelve cada vez más raro con el tiempo.
    const usuariosSinMigrar = await db.usuario.findMany({ where: { activo: true, pinLookup: null } });
    for (const usuario of usuariosSinMigrar) {
      if (await bcrypt.compare(pin, usuario.pinHash)) {
        usuarioEncontrado = usuario;
        break;
      }
    }
    if (usuarioEncontrado) {
      await db.usuario.update({ where: { id: usuarioEncontrado.id }, data: { pinLookup } }).catch(() => {});
    }
  }

  if (!usuarioEncontrado) {
    return NextResponse.json({ error: "PIN incorrecto" }, { status: 401 });
  }

  // Si es Colaborador (no Supervisor) y tiene un supervisor asignado,
  // bloqueamos su acceso individual.
  const errorAcceso = await verificarAccesoColaborador(usuarioEncontrado);
  if (errorAcceso) {
    return NextResponse.json({ error: errorAcceso }, { status: 403 });
  }

  const res = NextResponse.json({
    rol: usuarioEncontrado.rol,
    nombre: usuarioEncontrado.nombre,
  });
  await establecerCookieSesion(res, { id: usuarioEncontrado.id, rol: usuarioEncontrado.rol });

  return res;
}