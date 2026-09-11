// lib/jwtSecret.ts
// Secreto de firma de sesión — SOLO para código de servidor (lib/auth.ts,
// lib/pin.ts, proxy.ts). Vive separado de lib/config.ts a propósito:
// lib/config.ts también lo importan componentes "use client" (AppShell,
// login) para APP_NOMBRE/etc., y en el navegador process.env.JWT_SECRET
// siempre es undefined (Next.js solo expone variables NEXT_PUBLIC_ al
// cliente) — si el chequeo de abajo viviera ahí, tiraría este error en
// CADA página en vez de solo fallar al arrancar el servidor.
if (!process.env.JWT_SECRET) {
  throw new Error("Falta la variable de entorno JWT_SECRET");
}
export const JWT_SECRET = process.env.JWT_SECRET;
