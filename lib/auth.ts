// lib/auth.ts
// Funciones para crear y verificar la sesión de login (usando JWT).

import { cache } from "react";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import { DURACION_SESION_SEGUNDOS } from "./config";
import { JWT_SECRET } from "./jwtSecret";
import { db } from "./db";
import { obtenerColaboradorPorUsuarioId } from "./colaboradorSesion";
import { sesionRevocada } from "./sesionRevocada";

const secret = new TextEncoder().encode(JWT_SECRET);

export type SesionUsuario = {
  id: string;
  rol: "SUPER_ADMIN" | "ADMIN_TH" | "COORDINADOR" | "COLABORADOR" | "NOMINA" | "JEFE";
};

// Crea un token firmado que se guarda en una cookie del navegador.
// setIssuedAt() es necesario para poder revocar sesiones más tarde
// (sesionRevocada compara este "iat" contra sesionesRevocadasEn).
export async function crearToken(payload: SesionUsuario) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${DURACION_SESION_SEGUNDOS}s`)
    .sign(secret);
}

// Lee la sesión actual desde la cookie (null si no hay sesión, expiró, o
// un Super Admin la revocó explícitamente desde el panel de accesos).
//
// cache() de React memoiza por la duración de UNA sola petición: el layout
// compartido de las pantallas internas ya llama a getSession(), y casi
// todas las páginas individuales la vuelven a llamar por su cuenta (para
// sus propias validaciones de rol) — sin esto, cada navegación disparaba
// dos consultas idénticas a la base (la del layout y la de la página) más
// la de proxy.ts, que es un contexto aparte y no se puede memoizar acá.
export const getSession = cache(async (): Promise<SesionUsuario | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    const sesion = payload as unknown as SesionUsuario & { iat?: number };
    if (await sesionRevocada(sesion.id, sesion.iat)) return null;
    return { id: sesion.id, rol: sesion.rol };
  } catch {
    return null;
  }
});

// Nombre y foto a mostrar en el AppShell (sidebar/header), sin importar
// el rol. Se usa una sola vez desde el layout compartido de las pantallas
// internas, en vez de que cada página vuelva a consultarlo por su cuenta.
export async function obtenerPerfilSesion(
  session: SesionUsuario
): Promise<{ nombre: string; fotoUrl: string | null; esSupervisor: boolean }> {
  if (session.rol === "COLABORADOR") {
    const colaborador = await obtenerColaboradorPorUsuarioId(session.id);
    return {
      nombre: colaborador?.nombreCompleto ?? "",
      fotoUrl: colaborador?.fotoUrl ?? null,
      esSupervisor: colaborador?.esSupervisor ?? false,
    };
  }
  const usuario = await db.usuario.findUnique({ where: { id: session.id }, select: { nombre: true } });
  return { nombre: usuario?.nombre ?? "", fotoUrl: null, esSupervisor: false };
}

// Firma el token de la sesión y lo deja puesto en la cookie de la respuesta.
// Centralizado para que el login por PIN y el login biométrico usen
// exactamente la misma configuración de cookie.
//
// Sesión única por usuario: cada login de éxito revoca cualquier sesión
// anterior de ese mismo usuario (otro dispositivo, otra pestaña, etc.) —
// mismo mecanismo que "Cerrar sesión" en el panel de Accesos, pero
// automático. sesionesRevocadasEn se trunca al inicio del segundo actual
// (igual que el "iat" del JWT, que jose también trunca a segundos) para
// que el token que se firma a continuación no quede revocado por su
// propia marca de tiempo.
export async function establecerCookieSesion(res: NextResponse, usuario: SesionUsuario) {
  const ahoraTruncado = new Date(Math.floor(Date.now() / 1000) * 1000);
  await db.usuario.update({ where: { id: usuario.id }, data: { sesionesRevocadasEn: ahoraTruncado } });

  const token = await crearToken(usuario);
  res.cookies.set("session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: DURACION_SESION_SEGUNDOS,
    path: "/",
  });
}

// Si es un Colaborador (no Supervisor) con un supervisor asignado, sus
// pasajes ahora los gestiona el supervisor y se le bloquea el acceso
// individual. Devuelve el mensaje de error, o null si puede entrar.
// Compartido entre el login por PIN y el login biométrico.
export async function verificarAccesoColaborador(usuario: {
  id: string;
  rol: string;
}): Promise<string | null> {
  if (usuario.rol !== "COLABORADOR") return null;
  const colaborador = await db.colaborador.findUnique({
    where: { usuarioId: usuario.id },
    include: { supervisor: { select: { nombreCompleto: true } } },
  });
  if (colaborador && !colaborador.esSupervisor && colaborador.supervisorId) {
    return `No puedes ingresar: tus pasajes ahora los gestiona tu supervisor, ${
      colaborador.supervisor?.nombreCompleto ?? "asignado"
    }.`;
  }
  return null;
}