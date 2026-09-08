// app/api/auth/webauthn/registro-opciones/route.ts
// POST: paso 1 de registrar una passkey. Requiere sesión activa (ya se
// entró con PIN antes) — solo genera el "challenge" que el navegador le
// va a pedir firmar al autenticador (Face ID/Touch ID/Windows Hello).

import { NextResponse } from "next/server";
import { generateRegistrationOptions } from "@simplewebauthn/server";
import { db } from "../../../../../lib/db";
import { getSession } from "../../../../../lib/auth";
import { obtenerRpConfig, COOKIE_DESAFIO, DURACION_DESAFIO_SEGUNDOS } from "../../../../../lib/webauthn";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const usuario = await db.usuario.findUnique({ where: { id: session.id } });
  if (!usuario) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const existentes = await db.credencialBiometrica.findMany({
    where: { usuarioId: session.id },
    select: { credentialId: true },
  });

  const { rpName, rpID } = obtenerRpConfig(req);

  const opciones = await generateRegistrationOptions({
    rpName,
    rpID,
    userName: usuario.nombre,
    userID: new TextEncoder().encode(usuario.id),
    userDisplayName: usuario.nombre,
    attestationType: "none",
    excludeCredentials: existentes.map((c) => ({ id: c.credentialId })),
    authenticatorSelection: {
      residentKey: "required",
      userVerification: "required",
    },
  });

  const res = NextResponse.json(opciones);
  res.cookies.set(COOKIE_DESAFIO, JSON.stringify({ challenge: opciones.challenge, usuarioId: session.id }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: DURACION_DESAFIO_SEGUNDOS,
    path: "/",
  });
  return res;
}
