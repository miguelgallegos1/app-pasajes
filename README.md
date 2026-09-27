# Gestión de Pasajes

App web (PWA) para registrar, aprobar, revisar y pagar pasajes de los colaboradores.

## Flujo

`PENDIENTE` → **Talento Humano** aprueba → `APROBADA` → **Coordinación** revisa → `REVISADO` → **Nómina** paga → `PAGADA`
(TH puede devolver una solicitud a corrección → `RECHAZADA`).

Roles: Colaborador (y Supervisor de su equipo), Talento Humano, Coordinador, Nómina, Jefe y Super Administrador. TH y Coordinación ven solo las Empresas/Sitios/Áreas que tienen asignadas.

## Stack

- Next.js 16 (App Router) + React 19 + Tailwind CSS 4
- Prisma 7 sobre PostgreSQL (Neon), cliente generado en `app/generated/prisma`
- Sesión con JWT en cookie (`lib/auth.ts`, renovada en `proxy.ts`), acceso por PIN y biometría (WebAuthn)
- Notificaciones push (`public/sw.js`, `lib/webPush.ts`)
- Despliegue en Vercel: cada push a `master` publica en producción

## Estructura

| Carpeta | Qué hay |
|---|---|
| `app/(app)/` | Pantallas con sesión (comparten `AppShell`: menú, header) |
| `app/api/` | Endpoints (validan sesión, rol y alcance) |
| `app/th/historial/imprimir/` | Constancia de pago (fuera de `(app)` para imprimir sin menú) |
| `components/` | Pantallas (`Panel*.tsx`) y componentes compartidos |
| `lib/` | Helpers de servidor y cliente, hooks, reglas de negocio |
| `lib/novedades.ts` | Novedades de la app (se publican editando este archivo) |
| `prisma/` | Esquema y migraciones |

## Desarrollo

```bash
npm install          # también genera el cliente de Prisma
npm run dev          # http://localhost:3000
npx tsc --noEmit -p . && npx eslint .   # verificación antes de publicar
```

Variables en `.env` (`DATABASE_URL`, `JWT_SECRET`, claves VAPID de push). Las migraciones se aplican con `npx prisma migrate deploy` (configuración en `prisma7.config.ts`).
