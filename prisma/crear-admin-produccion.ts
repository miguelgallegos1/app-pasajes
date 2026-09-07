// prisma/crear-admin-produccion.ts
// Script de UNA SOLA VEZ para crear el primer Super Admin real, después
// de borrar todos los datos de prueba. NO se ejecuta con "npx prisma db
// seed" (eso sigue usando seed.ts para tus pruebas locales) — se corre
// directo con: npx tsx prisma/crear-admin-produccion.ts

import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { calcularPinLookup } from "../lib/pin";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

async function main() {
  const nombre = "MIGUEL GALLEGOS CALDERON"; // ej: "Miguel Gallegos"
  const pin = "201220"; // 6 dígitos, será tu PIN real de producción

  const pinHash = await bcrypt.hash(pin, 10);

  const admin = await db.usuario.create({
    data: { nombre, pinHash, pinLookup: calcularPinLookup(pin), rol: "SUPER_ADMIN" },
  });

  console.log("✅ Super Admin creado:", admin.nombre);
}

main().finally(() => db.$disconnect());