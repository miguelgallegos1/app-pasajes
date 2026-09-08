// app/api/auth/webauthn/login-verificar/route.ts
// POST: paso 2 del login biométrico. La credencial que manda el navegador
// (su "id") ya nos dice a qué usuario pertenece; se verifica la firma
// contra el challenge y, si es válida, se abre sesión igual que con el PIN.

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import { db } from "../../../../../lib/db";
import { establecerCookieSesion, verificarAccesoColaborador } from "../../../../../lib/auth";
import { obtenerRpConfig, COOKIE_DESAFIO } from "../../../../../lib/webauthn";

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const desafioRaw = cookieStore.get(COOKIE_DESAFIO)?.value;
  if (!desafioRaw) {
    return NextResponse.json({ error: "El acceso expiró, intenta de nuevo" }, { status: 400 });
  }

  let challenge: string;
  try {
    ({ challenge } = JSON.parse(desafioRaw));
  } catch {
    return NextResponse.json({ error: "El acceso expiró, intenta de nuevo" }, { status: 400 });
  }

  const response = await req.json();
  const credentialId: string | undefined = response?.id;
  if (!credentialId) {
    return NextResponse.json({ error: "Respuesta inválida" }, { status: 400 });
  }

  const credencial = await db.credencialBiometrica.findUnique({
    where: { credentialId },
    include: { usuario: true },
  });
  if (!credencial) {
    return NextResponse.json({ error: "Este dispositivo no tiene acceso biométrico registrado" }, { status: 401 });
  }
  if (!credencial.usuario.activo) {
    return NextResponse.json({ error: "Tu cuenta está inactiva" }, { status: 403 });
  }

  const { rpID, origin } = obtenerRpConfig(req);

  let verificacion;
  try {
    verificacion = await verifyAuthenticationResponse({
      response,
      expectedChallenge: challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      credential: {
        id: credencial.credentialId,
        publicKey: new Uint8Array(Buffer.from(credencial.publicKey, "base64url")),
        counter: credencial.contador,
      },
      requireUserVerification: true,
    });
  } catch {
    return NextResponse.json({ error: "No se pudo verificar tu identidad" }, { status: 401 });
  }

  if (!verificacion.verified) {
    return NextResponse.json({ error: "No se pudo verificar tu identidad" }, { status: 401 });
  }

  await db.credencialBiometrica.update({
    where: { id: credencial.id },
    data: { contador: verificacion.authenticationInfo.newCounter, ultimoUso: new Date() },
  });

  const usuarioEncontrado = credencial.usuario;

  const errorAcceso = await verificarAccesoColaborador(usuarioEncontrado);
  if (errorAcceso) {
    return NextResponse.json({ error: errorAcceso }, { status: 403 });
  }

  const res = NextResponse.json({ rol: usuarioEncontrado.rol, nombre: usuarioEncontrado.nombre });
  await establecerCookieSesion(res, { id: usuarioEncontrado.id, rol: usuarioEncontrado.rol });
  res.cookies.delete(COOKIE_DESAFIO);
  return res;
}
