// proxy.ts
// Protege las rutas por rol ANTES de que la página se cargue.
// (En Next.js 16, esto reemplaza al antiguo "middleware.ts".)

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const secret = new TextEncoder().encode(process.env.JWT_SECRET);

const RUTAS_POR_ROL: Record<string, string[]> = {
  "/mis-pasajes": ["COLABORADOR"],
  "/th": ["ADMIN_TH", "SUPER_ADMIN"],
  "/finanzas": ["FINANZAS", "SUPER_ADMIN"],
  "/admin": ["SUPER_ADMIN"],
  "/dashboard": ["ADMIN_TH", "FINANZAS", "SUPER_ADMIN"],
};

const INICIO_POR_ROL: Record<string, string> = {
  COLABORADOR: "/mis-pasajes",
  ADMIN_TH: "/dashboard",
  FINANZAS: "/dashboard",
  SUPER_ADMIN: "/dashboard",
};

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get("session")?.value;

  let payload: { id: string; rol: string } | null = null;
  if (token) {
    try {
      const verificado = await jwtVerify(token, secret);
      payload = verificado.payload as unknown as { id: string; rol: string };
    } catch {
      payload = null;
    }
  }

  if (pathname === "/login" && payload) {
    return NextResponse.redirect(new URL(INICIO_POR_ROL[payload.rol] ?? "/login", req.url));
  }

  const rutaProtegida = Object.keys(RUTAS_POR_ROL).find((r) => pathname.startsWith(r));
  if (!rutaProtegida) return NextResponse.next();

  if (!payload) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const rolesPermitidos = RUTAS_POR_ROL[rutaProtegida];
  if (!rolesPermitidos.includes(payload.rol)) {
    return NextResponse.redirect(new URL(INICIO_POR_ROL[payload.rol] ?? "/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/mis-pasajes/:path*",
    "/th/:path*",
    "/finanzas/:path*",
    "/admin/:path*",
    "/dashboard/:path*",
    "/login",
  ],
};