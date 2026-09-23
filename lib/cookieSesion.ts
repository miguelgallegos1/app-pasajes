// lib/cookieSesion.ts
// Cookies de la sesión, en un archivo aparte sin dependencias de base de
// datos para poder usarlo también desde proxy.ts.

import type { NextResponse } from "next/server";
import { DURACION_SESION_SEGUNDOS } from "./config";

// Cookie testigo, legible desde el navegador (no httpOnly), que vence junto
// con la de sesión. No lleva nada sensible: solo sirve para que
// VigilanteSesion note que la sesión venció y mande al login. Se mira si
// existe (el navegador la borra sola al cumplir su maxAge) y no su valor,
// para no depender de que el reloj del dispositivo esté bien.
export const COOKIE_TESTIGO_SESION = "session_activa";

export function ponerCookiesSesion(res: NextResponse, token: string) {
  const secure = process.env.NODE_ENV === "production";
  res.cookies.set("session", token, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    maxAge: DURACION_SESION_SEGUNDOS,
    path: "/",
  });
  res.cookies.set(COOKIE_TESTIGO_SESION, "1", {
    secure,
    sameSite: "lax",
    maxAge: DURACION_SESION_SEGUNDOS,
    path: "/",
  });
}

export function borrarCookiesSesion(res: NextResponse) {
  res.cookies.set("session", "", { maxAge: 0, path: "/" });
  res.cookies.set(COOKIE_TESTIGO_SESION, "", { maxAge: 0, path: "/" });
}
