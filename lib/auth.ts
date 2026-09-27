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
import { obtenerAreasPermitidasTH } from "./alcanceTH";
import { ponerCookiesSesion } from "./cookieSesion";

const secret = new TextEncoder().encode(JWT_SECRET);

export type SesionUsuario = {
  id: string;
  rol: "SUPER_ADMIN" | "ADMIN_TH" | "COORDINADOR" | "COLABORADOR" | "NOMINA" | "JEFE";
};

// Crea un token firmado que se guarda en una cookie del navegador.
// setIssuedAt() es necesario para que setExpirationTime() calcule el
// vencimiento relativo a este momento.
async function crearToken(payload: SesionUsuario) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${DURACION_SESION_SEGUNDOS}s`)
    .sign(secret);
}

// ¿El usuario de la sesión sigue habilitado? Sin esto, desactivar a
// alguien (o cambiarle el rol) no afectaba la sesión que ya tenía abierta:
// el JWT seguía siendo válido y se renovaba con cada acción. Se verifica
// en la base (una lectura por id: activo + rol, y para el colaborador su
// estado y si ahora lo gestiona un supervisor, igual que en el login) y
// el resultado se guarda VIGENCIA_VERIFICACION_MS en memoria del servidor,
// para no consultar en cada clic: una baja se aplica en ≤30 segundos.
const VIGENCIA_VERIFICACION_MS = 30_000;
const verificaciones = new Map<string, { habilitado: boolean; hasta: number }>();

async function sesionHabilitada(sesion: SesionUsuario): Promise<boolean> {
  const clave = `${sesion.id}|${sesion.rol}`;
  const ahora = Date.now();
  const guardada = verificaciones.get(clave);
  if (guardada && guardada.hasta > ahora) return guardada.habilitado;

  const usuario = await db.usuario.findUnique({
    where: { id: sesion.id },
    select: { activo: true, rol: true, colaborador: { select: { estado: true, esSupervisor: true, supervisorId: true } } },
  });
  const c = usuario?.colaborador;
  const habilitado =
    !!usuario &&
    usuario.activo &&
    usuario.rol === sesion.rol &&
    (usuario.rol !== "COLABORADOR" || (!!c && c.estado === "ACTIVO" && (c.esSupervisor || !c.supervisorId)));

  // Evita que el mapa crezca sin límite en una instancia de larga vida.
  if (verificaciones.size > 5000) verificaciones.clear();
  verificaciones.set(clave, { habilitado, hasta: ahora + VIGENCIA_VERIFICACION_MS });
  return habilitado;
}

// Lee la sesión actual desde la cookie (null si no hay sesión, expiró, o
// el usuario ya no está habilitado — ver sesionHabilitada).
//
// cache() de React memoiza por la duración de UNA sola petición: el layout
// compartido de las pantallas internas ya llama a getSession(), y casi
// todas las páginas individuales la vuelven a llamar por su cuenta (para
// sus propias validaciones de rol) — sin esto, cada navegación disparaba
// dos verificaciones idénticas (la del layout y la de la página).
export const getSession = cache(async (): Promise<SesionUsuario | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;
  if (!token) return null;
  let actual: SesionUsuario;
  try {
    const { payload } = await jwtVerify(token, secret);
    const sesion = payload as unknown as SesionUsuario;
    actual = { id: sesion.id, rol: sesion.rol };
  } catch {
    return null;
  }
  // Fuera del try: si la base falla, que sea un error como cualquier otro
  // (no "sin sesión", que mandaría a todos al login por un corte breve).
  return (await sesionHabilitada(actual)) ? actual : null;
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
export async function establecerCookieSesion(res: NextResponse, usuario: SesionUsuario) {
  ponerCookiesSesion(res, await crearToken(usuario));
}

// Si es un Colaborador inactivo, o (no Supervisor) con un supervisor
// asignado — sus pasajes ahora los gestiona el supervisor —, se le
// bloquea el acceso individual. Devuelve el mensaje de error, o null si puede entrar.
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
  // Desactivado desde TH -> Colaboradores -> Gestionar: antes solo se
  // miraba usuario.activo, así que un colaborador Inactivo seguía entrando.
  if (colaborador && colaborador.estado !== "ACTIVO") {
    return "Tu usuario está inactivo. Comunícate con Talento Humano.";
  }
  if (colaborador && !colaborador.esSupervisor && colaborador.supervisorId) {
    return `No puedes ingresar: tus pasajes ahora los gestiona tu supervisor, ${
      colaborador.supervisor?.nombreCompleto ?? "asignado"
    }.`;
  }
  return null;
}
// Ficha de colaborador propia de un usuario administrativo (Admin ->
// Usuarios): sus solicitudes las gestiona como si fuera el dueño. Solo
// cuenta si la ficha es de una EMPRESA de su alcance asignado (Super Admin,
// sin restricción, siempre). Los colaboradores no la usan (son dueños por
// su propia cuenta), así que para ellos no se consulta nada.
export async function obtenerFichaPropiaId(sesion: SesionUsuario): Promise<string | null> {
  if (sesion.rol === "COLABORADOR") return null;
  const usuario = await db.usuario.findUnique({
    where: { id: sesion.id },
    select: { colaboradorPropio: { select: { id: true, area: { select: { sitio: { select: { empresaId: true } } } } } } },
  });
  const ficha = usuario?.colaboradorPropio;
  if (!ficha) return null;
  if (sesion.rol === "SUPER_ADMIN") return ficha.id;
  const empresasAsignadas = new Set((await obtenerAreasPermitidasTH(sesion.id, sesion.rol)).map((a) => a.sitio.empresa.id));
  return empresasAsignadas.has(ficha.area.sitio.empresaId) ? ficha.id : null;
}
