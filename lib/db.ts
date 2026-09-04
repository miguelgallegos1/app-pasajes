// lib/db.ts
// Cliente único de Prisma reutilizado en toda la app (evita abrir
// una conexión nueva cada vez que se importa este archivo).

import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

// En desarrollo, Next.js recarga el código constantemente (hot reload),
// así que guardamos el cliente en una variable global para no crear
// una conexión nueva cada vez que se recarga.
const globalForPrisma = globalThis as unknown as { db?: PrismaClient };

export const db = globalForPrisma.db ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.db = db;
}