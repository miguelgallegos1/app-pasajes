// lib/auth.ts
// Funciones para crear y verificar la sesión de login (usando JWT).

import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { DURACION_SESION_SEGUNDOS } from "./config";
import { db } from "./db";

const secret = new TextEncoder().encode(process.env.JWT_SECRET);

export type SesionUsuario = {
  id: string;
  rol: "SUPER_ADMIN" | "ADMIN_TH" | "COLABORADOR" | "FINANZAS";
};

// Crea un token firmado que se guarda en una cookie del navegador
export async function crearToken(payload: SesionUsuario) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(`${DURACION_SESION_SEGUNDOS}s`)
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

// Nombre y foto a mostrar en el AppShell (sidebar/header), sin importar
// el rol. Se usa una sola vez desde el layout compartido de las pantallas
// internas, en vez de que cada página vuelva a consultarlo por su cuenta.
export async function obtenerPerfilSesion(
  session: SesionUsuario
): Promise<{ nombre: string; fotoUrl: string | null }> {
  if (session.rol === "COLABORADOR") {
    const colaborador = await db.colaborador.findUnique({
      where: { usuarioId: session.id },
      select: { nombreCompleto: true, fotoUrl: true },
    });
    return { nombre: colaborador?.nombreCompleto ?? "", fotoUrl: colaborador?.fotoUrl ?? null };
  }
  const usuario = await db.usuario.findUnique({ where: { id: session.id }, select: { nombre: true } });
  return { nombre: usuario?.nombre ?? "", fotoUrl: null };
}