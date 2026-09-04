// app/api/auth/login/route.ts
// Endpoint que valida el PIN (el PIN por sí solo identifica al usuario,
// por eso cada PIN debe ser único en todo el sistema) y crea la sesión.

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

  // Como el PIN está hasheado (nunca en texto plano), no podemos buscarlo
  // directo en la base de datos. Comparamos contra cada usuario activo
  // hasta encontrar coincidencia. Para el tamaño de una empresa esto es
  // rápido y seguro.
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