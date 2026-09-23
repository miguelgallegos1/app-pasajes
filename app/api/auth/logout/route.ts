// app/api/auth/logout/route.ts
// POST: borra la cookie de sesión (cerrar sesión).

import { NextResponse } from "next/server";
import { borrarCookiesSesion } from "../../../../lib/cookieSesion";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  borrarCookiesSesion(res);
  return res;
}
