// proxy.ts
// Protege las rutas por rol ANTES de que la página se cargue.
// (En Next.js 16, esto reemplaza al antiguo "middleware.ts".)
//
// También implementa el cierre de sesión por inactividad: cada visita a
// una ruta protegida renueva el token con una nueva expiración. Si el
// usuario no genera ninguna visita durante DURACION_SESION_SEGUNDOS, el
// token vencido deja de validar y se le pide iniciar sesión de nuevo.

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify, SignJWT } from "jose";
import { DURACION_SESION_SEGUNDOS } from "./lib/config";
import { JWT_SECRET } from "./lib/jwtSecret";
import { INICIO_POR_ROL } from "./lib/roles";
import { sesionRevocada } from "./lib/sesionRevocada";
import { HEADER_ATESTACION, crearAtestacionSesion } from "./lib/atestacionSesion";

const secret = new TextEncoder().encode(JWT_SECRET);

const RUTAS_POR_ROL: Record<string, string[]> = {
  "/mis-pasajes": ["COLABORADOR"],
  "/th": ["ADMIN_TH", "SUPER_ADMIN"],
  "/coordinador": ["COORDINADOR", "SUPER_ADMIN"],
  "/nomina": ["NOMINA", "SUPER_ADMIN"],
  "/jefe": ["JEFE", "SUPER_ADMIN"],
  "/admin": ["SUPER_ADMIN"],
  "/dashboard": ["ADMIN_TH", "COORDINADOR", "NOMINA", "JEFE", "SUPER_ADMIN"],
};

// Reemite la cookie de sesión con una expiración fresca de
// DURACION_SESION_SEGUNDOS a partir de AHORA (ventana deslizante).
async function renovarSesion(
  res: NextResponse,
  payload: { id: string; rol: string }
) {
  const token = await new SignJWT({ id: payload.id, rol: payload.rol })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${DURACION_SESION_SEGUNDOS}s`)
    .sign(secret);

  res.cookies.set("session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: DURACION_SESION_SEGUNDOS,
    path: "/",
  });

  return res;
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get("session")?.value;

  // Se descarta ACÁ, apenas entra, cualquier valor que haya llegado ya en
  // la propia petición — antes de que exista la más mínima chance de que
  // pase de largo sin pasar por acá (por ejemplo, si el día de mañana se
  // agrega alguna ruta pública nueva al matcher). Recién más abajo, en el
  // único lugar donde se confirma la sesión, se vuelve a poner con el
  // valor real.
  const encabezadosLimpios = new Headers(req.headers);
  encabezadosLimpios.delete(HEADER_ATESTACION);

  let payload: { id: string; rol: string; iat?: number } | null = null;
  if (token) {
    try {
      const verificado = await jwtVerify(token, secret);
      payload = verificado.payload as unknown as { id: string; rol: string; iat?: number };
      // Chequeado ACÁ, antes de renovar: si no, cada visita le renueva la
      // cookie con un "iat" fresco y la sesión revocada quedaría válida
      // de nuevo en la siguiente navegación.
      if (await sesionRevocada(payload.id, payload.iat)) {
        payload = null;
      }
    } catch {
      payload = null;
    }
  }

  if (pathname === "/login" && payload) {
    return NextResponse.redirect(new URL(INICIO_POR_ROL[payload.rol] ?? "/login", req.url));
  }

  const rutaProtegida = Object.keys(RUTAS_POR_ROL).find((r) => pathname.startsWith(r));
  if (!rutaProtegida) return NextResponse.next({ request: { headers: encabezadosLimpios } });

  if (!payload) {
    const res = NextResponse.redirect(new URL("/login", req.url));
    res.cookies.delete("session");
    return res;
  }

  const rolesPermitidos = RUTAS_POR_ROL[rutaProtegida];
  if (!rolesPermitidos.includes(payload.rol)) {
    return NextResponse.redirect(new URL(INICIO_POR_ROL[payload.rol] ?? "/login", req.url));
  }

  // Le pasamos a la página una "atestación" firmada de que ya se validó
  // acá (ver lib/atestacionSesion.ts y el comentario en getSession(), en
  // lib/auth.ts) — así evita repetir la consulta de sesión revocada al
  // renderizar. encabezadosLimpios ya viene sin ningún valor de este
  // header que haya llegado en la petición original (ver arriba).
  encabezadosLimpios.set(HEADER_ATESTACION, await crearAtestacionSesion(payload));

  return renovarSesion(NextResponse.next({ request: { headers: encabezadosLimpios } }), payload);
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
    "/login",
  ],
};
