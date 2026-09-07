// app/api/auth/login/route.ts
// Endpoint que valida el PIN (el PIN por sí solo identifica al usuario).
// Si el usuario es un Colaborador SIN rol de Supervisor y YA tiene un
// supervisor asignado, se bloquea su acceso: sus pasajes ahora los
// registra el supervisor, no él directamente.

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "../../../../lib/db";
import { crearToken } from "../../../../lib/auth";

export async function POST(req: Request) {
  const { pin } = await req.json();

  if (!pin || pin.length !== 6) {
    return NextResponse.json(
      { error: "El PIN debe tener 6 dígitos" },
      { status: 400 }
    );
  }

  const usuarios = await db.usuario.findMany({ where: { activo: true } });

  let usuarioEncontrado = null;
  for (const usuario of usuarios) {
    if (await bcrypt.compare(pin, usuario.pinHash)) {
      usuarioEncontrado = usuario;
      break;
    }
  }

  if (!usuarioEncontrado) {
    return NextResponse.json({ error: "PIN incorrecto" }, { status: 401 });
  }

  // Si es Colaborador (no Supervisor) y tiene un supervisor asignado,
  // bloqueamos su acceso individual.
  if (usuarioEncontrado.rol === "COLABORADOR") {
    const colaborador = await db.colaborador.findUnique({
      where: { usuarioId: usuarioEncontrado.id },
      include: { supervisor: { select: { nombreCompleto: true } } },
    });

    if (colaborador && !colaborador.esSupervisor && colaborador.supervisorId) {
      return NextResponse.json(
        {
          error: `No puedes ingresar: tus pasajes ahora los gestiona tu supervisor, ${
            colaborador.supervisor?.nombreCompleto ?? "asignado"
          }.`,
        },
        { status: 403 }
      );
    }
  }

  const token = await crearToken({
    id: usuarioEncontrado.id,
    rol: usuarioEncontrado.rol,
  });

  const res = NextResponse.json({
    rol: usuarioEncontrado.rol,
    nombre: usuarioEncontrado.nombre,
  });
  res.cookies.set("session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 8,
    path: "/",
  });

  return res;
}