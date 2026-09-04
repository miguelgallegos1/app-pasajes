// lib/auth.ts
// Funciones para crear y verificar la sesión de login (usando JWT).

import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const secret = new TextEncoder().encode(process.env.JWT_SECRET);

export type SesionUsuario = {
  id: string;
  rol: "SUPER_ADMIN" | "ADMIN_TH" | "COLABORADOR" | "FINANZAS";
};

// Crea un token firmado que se guarda en una cookie del navegador
export async function crearToken(payload: SesionUsuario) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("8h")
    .sign(secret);
}

// Lee la sesión actual desde la cookie (null si no hay sesión o expiró)
export async function getSession(): Promise<SesionUsuario | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as SesionUsuario;
  } catch {
    return null;
  }
}