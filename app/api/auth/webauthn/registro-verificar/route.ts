// app/api/auth/webauthn/registro-verificar/route.ts
// POST: paso 2 de registrar una passkey. Verifica la respuesta firmada por
// el autenticador contra el "challenge" que se guardó en la cookie, y si es
// válida, guarda la credencial (nunca el dato biométrico en sí, eso nunca
// sale del dispositivo del usuario).

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyRegistrationResponse } from "@simplewebauthn/server";
import { db } from "../../../../../lib/db";
import { getSession } from "../../../../../lib/auth";
import { obtenerRpConfig, COOKIE_DESAFIO } from "../../../../../lib/webauthn";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const cookieStore = await cookies();
  const desafioRaw = cookieStore.get(COOKIE_DESAFIO)?.value;
  if (!desafioRaw) {
    return NextResponse.json({ error: "El registro expiró, intenta de nuevo" }, { status: 400 });
  }

  let challenge: string, usuarioId: string;
  try {
    ({ challenge, usuarioId } = JSON.parse(desafioRaw));
  } catch {
    return NextResponse.json({ error: "El registro expiró, intenta de nuevo" }, { status: 400 });
  }
  if (usuarioId !== session.id) {
    return NextResponse.json({ error: "Sesión inválida" }, { status: 400 });
  }

  const { response, dispositivo } = await req.json();
  const { rpID, origin } = obtenerRpConfig(req);

  let verificacion;
  try {
    verificacion = await verifyRegistrationResponse({
      response,
      expectedChallenge: challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
    });
  } catch {
    return NextResponse.json({ error: "No se pudo verificar el dispositivo" }, { status: 400 });
  }

  if (!verificacion.verified || !verificacion.registrationInfo) {
    return NextResponse.json({ error: "No se pudo verificar el dispositivo" }, { status: 400 });
  }

  const { credential } = verificacion.registrationInfo;

  try {
    await db.credencialBiometrica.create({
      data: {
        usuarioId: session.id,
        credentialId: credential.id,
        publicKey: Buffer.from(credential.publicKey).toString("base64url"),
        contador: credential.counter,
        dispositivo: typeof dispositivo === "string" ? dispositivo.trim().slice(0, 60) || null : null,
      },
    });
  } catch (e: any) {
    if (e.code === "P2002") {
      return NextResponse.json({ error: "Ese dispositivo ya está registrado" }, { status: 400 });
    }
    throw e;
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.delete(COOKIE_DESAFIO);
  return res;
}
