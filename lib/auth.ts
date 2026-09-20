// lib/auth.ts
// Funciones para crear y verificar la sesión de login (usando JWT).

import { cache } from "react";
import { SignJWT, jwtVerify } from "jose";
import { cookies, headers } from "next/headers";
import type { NextResponse } from "next/server";
import { DURACION_SESION_SEGUNDOS } from "./config";
import { JWT_SECRET } from "./jwtSecret";
import { db } from "./db";
import { obtenerColaboradorPorUsuarioId } from "./colaboradorSesion";
import { sesionRevocada } from "./sesionRevocada";
import { HEADER_ATESTACION, TIPO_ATESTACION } from "./atestacionSesion";

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
//
// Camino rápido con la atestación de proxy.ts: las rutas de página ya
// pasan por proxy.ts, que hace exactamente esta misma verificación
// (incluida sesionRevocada, una consulta a la base) ANTES de que la
// página renderice. En vez de repetirla acá, proxy.ts firma un token
// cortito (10s) con el mismo secreto y lo manda en un header — si llega y
// la firma es válida, es matemáticamente imposible que lo haya fabricado
// otra cosa que no sea proxy.ts (nadie más tiene JWT_SECRET), así que se
// confía sin volver a tocar la base. Si el header falta o no verifica
// (por ejemplo, en una ruta /api/*, que el matcher de proxy.ts no cubre)
// se cae exactamente al camino de siempre: cookie + jwtVerify +
// sesionRevocada, sin ningún cambio de seguridad ahí.
export const getSession = cache(async (): Promise<SesionUsuario | null> => {
  const encabezados = await headers();
  const atestacion = encabezados.get(HEADER_ATESTACION);
  if (atestacion) {
    try {
      const { payload } = await jwtVerify(atestacion, secret);
      const datos = payload as unknown as { id: string; rol: SesionUsuario["rol"]; tipo?: string };
      if (datos.tipo === TIPO_ATESTACION) return { id: datos.id, rol: datos.rol };
    } catch {
      // Vencida o inválida: sigue abajo con la verificación completa.
    }
  }

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

// "Primer nombre + primer apellido" para el saludo del header, que no
// necesita el nombre completo y ocupaba demasiado espacio. Para
// colaboradores se arma bien (con los campos nombres/apellidos, ya
// separados); para el resto de roles (Usuario.nombre es un solo texto
// libre, sin esa separación) es un best-effort con las 2 primeras
// palabras — no hay forma de saber cuál es cuál sin esos campos.
function acortarNombre(nombres: string, apellidos: string): string {
  const primerNombre = nombres.trim().split(/\s+/)[0] ?? "";
  const primerApellido = apellidos.trim().split(/\s+/)[0] ?? "";
  return [primerNombre, primerApellido].filter(Boolean).join(" ");
}

// Para Usuario.nombre (texto libre, sin nombres/apellidos separados):
// misma convención que usa el resto de la app para nombre completo
// (Colaborador.nombreCompleto = apellidos + nombres, apellidos primero,
// como en la cédula) — así que con 3+ palabras se asumen 2 apellidos
// (puede haber 1 o 2 nombres después), y con exactamente 2, un apellido y
// un nombre. El primer nombre es siempre la primera palabra DESPUÉS de
// los apellidos, nunca la última palabra del texto completo.
export function acortarNombreLibre(nombreCompleto: string): string {
  const palabras = nombreCompleto.trim().split(/\s+/).filter(Boolean);
  if (palabras.length <= 1) return palabras[0] ?? "";
  const primerApellido = palabras[0];
  const indiceNombre = palabras.length >= 3 ? 2 : 1;
  const primerNombre = palabras[indiceNombre];
  return `${primerNombre} ${primerApellido}`;
}

// Nombre y foto a mostrar en el AppShell (sidebar/header), sin importar
// el rol. Se usa una sola vez desde el layout compartido de las pantallas
// internas, en vez de que cada página vuelva a consultarlo por su cuenta.
export async function obtenerPerfilSesion(
  session: SesionUsuario
): Promise<{ nombre: string; nombreCorto: string; fotoUrl: string | null; esSupervisor: boolean }> {
  if (session.rol === "COLABORADOR") {
    const colaborador = await obtenerColaboradorPorUsuarioId(session.id);
    return {
      nombre: colaborador?.nombreCompleto ?? "",
      nombreCorto: colaborador ? acortarNombre(colaborador.nombres, colaborador.apellidos) : "",
      fotoUrl: colaborador?.fotoUrl ?? null,
      esSupervisor: colaborador?.esSupervisor ?? false,
    };
  }
  const usuario = await db.usuario.findUnique({ where: { id: session.id }, select: { nombre: true } });
  return {
    nombre: usuario?.nombre ?? "",
    nombreCorto: acortarNombreLibre(usuario?.nombre ?? ""),
    fotoUrl: null,
    esSupervisor: false,
  };
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