// proxy.ts
// Protege las rutas por rol ANTES de que la página se cargue.
// (En Next.js 16, esto reemplaza al antiguo "middleware.ts".)
//
// También implementa el cierre de sesión por inactividad: cada visita a
// una ruta protegida, y cada acción del usuario contra /api, renueva el
// token con una nueva expiración. Si el usuario no hace nada durante
// DURACION_SESION_SEGUNDOS, el token vencido deja de validar y se le pide
// iniciar sesión de nuevo (ver components/VigilanteSesion.tsx).

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify, SignJWT } from "jose";
import { DURACION_SESION_SEGUNDOS } from "./lib/config";
import { JWT_SECRET } from "./lib/jwtSecret";
import { INICIO_POR_ROL } from "./lib/roles";
import { ponerCookiesSesion, borrarCookiesSesion } from "./lib/cookieSesion";

const secret = new TextEncoder().encode(JWT_SECRET);

const RUTAS_POR_ROL: Record<string, string[]> = {
  "/mis-pasajes": ["COLABORADOR"],
  "/th": ["ADMIN_TH", "SUPER_ADMIN"],
  "/coordinador": ["COORDINADOR", "SUPER_ADMIN"],
  "/nomina": ["NOMINA", "SUPER_ADMIN"],
  "/jefe": ["JEFE", "SUPER_ADMIN"],
  "/admin": ["SUPER_ADMIN"],
  "/dashboard": ["ADMIN_TH", "COORDINADOR", "NOMINA", "JEFE", "SUPER_ADMIN"],
  "/novedades": ["COLABORADOR", "ADMIN_TH", "COORDINADOR", "NOMINA", "JEFE", "SUPER_ADMIN"],
};

// Pedidos a /api que NO cuentan como actividad del usuario: el sondeo
// automático de la campanita (NotificacionesMenu.tsx) — si renovara, una
// pestaña abierta nunca vencería. /api/auth/* maneja su propia cookie.
const API_SIN_RENOVAR = ["/api/dashboard/pendientes-accion", "/api/auth/"];

type Payload = { id: string; rol: string; exp?: number };

// En /api solo se re-firma cuando ya pasó la mitad de la sesión: una
// ráfaga de acciones seguidas renueva una vez, no en cada pedido.
function pasoMitadDeLaSesion(payload: Payload) {
  if (!payload.exp) return true;
  return payload.exp * 1000 - Date.now() < (DURACION_SESION_SEGUNDOS * 1000) / 2;
}

// Reemite la cookie de sesión con una expiración fresca de
// DURACION_SESION_SEGUNDOS a partir de AHORA (ventana deslizante).
async function renovarSesion(
  res: NextResponse,
  payload: Payload
) {
  const token = await new SignJWT({ id: payload.id, rol: payload.rol })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${DURACION_SESION_SEGUNDOS}s`)
    .sign(secret);

  ponerCookiesSesion(res, token);

  return res;
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get("session")?.value;

  let payload: Payload | null = null;
  if (token) {
    try {
      const verificado = await jwtVerify(token, secret);
      payload = verificado.payload as unknown as Payload;
    } catch {
      payload = null;
    }
  }

  if (pathname.startsWith("/api/")) {
    // Las rutas de /api validan la sesión por su cuenta; acá solo se renueva.
    if (!payload || API_SIN_RENOVAR.some((r) => pathname.startsWith(r)) || !pasoMitadDeLaSesion(payload)) {
      return NextResponse.next();
    }
    return renovarSesion(NextResponse.next(), payload);
  }

  if (pathname === "/login" && payload) {
    return NextResponse.redirect(new URL(INICIO_POR_ROL[payload.rol] ?? "/login", req.url));
  }

  const rutaProtegida = Object.keys(RUTAS_POR_ROL).find((r) => pathname.startsWith(r));
  if (!rutaProtegida) return NextResponse.next();

  if (!payload) {
    const res = NextResponse.redirect(new URL("/login", req.url));
    borrarCookiesSesion(res);
    return res;
  }

  const rolesPermitidos = RUTAS_POR_ROL[rutaProtegida];
  if (!rolesPermitidos.includes(payload.rol)) {
    return NextResponse.redirect(new URL(INICIO_POR_ROL[payload.rol] ?? "/login", req.url));
  }

  return renovarSesion(NextResponse.next(), payload);
}

export const config = {
  matcher: [
    "/mis-pasajes/:path*",
    "/th/:path*",
    "/coordinador/:path*",
    "/nomina/:path*",
    "/jefe/:path*",
    "/admin/:path*",
    "/dashboard/:path*",
    "/novedades",
    "/api/:path*",
    "/login",
  ],
};
