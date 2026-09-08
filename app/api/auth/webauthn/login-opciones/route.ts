// app/api/auth/webauthn/login-opciones/route.ts
// POST: paso 1 del login biométrico. No requiere sesión (todavía no
// sabemos quién es) — el navegador ofrece las passkeys que ya tiene
// guardadas para este sitio, sin necesidad de escribir nada antes.

import { NextResponse } from "next/server";
import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { obtenerRpConfig, COOKIE_DESAFIO, DURACION_DESAFIO_SEGUNDOS } from "../../../../../lib/webauthn";

export async function POST(req: Request) {
  const { rpID } = obtenerRpConfig(req);

  const opciones = await generateAuthenticationOptions({
    rpID,
    userVerification: "required",
  });

  const res = NextResponse.json(opciones);
  res.cookies.set(COOKIE_DESAFIO, JSON.stringify({ challenge: opciones.challenge }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: DURACION_DESAFIO_SEGUNDOS,
    path: "/",
  });
  return res;
}
