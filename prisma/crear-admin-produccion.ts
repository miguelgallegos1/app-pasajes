// prisma/crear-admin-produccion.ts
// Script de UNA SOLA VEZ para crear el primer Super Admin real, después
// de borrar todos los datos de prueba. NO se ejecuta con "npx prisma db
// seed" (eso sigue usando seed.ts para tus pruebas locales) — se corre
// directo con: npx tsx prisma/crear-admin-produccion.ts
//
// Nombre y PIN se piden por variables de entorno en vez de escribirlos acá
// — así el script nunca queda con un PIN real en texto plano dentro del
// código fuente (ni en el archivo ni, sobre todo, en el historial de git).
// Ejemplo de uso (no queda guardado en ningún lado, solo en la terminal):
//   ADMIN_NOMBRE="TU NOMBRE" ADMIN_PIN="123456" npx tsx prisma/crear-admin-produccion.ts

import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { calcularPinLookup } from "../lib/pin";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

async function main() {
  const nombre = process.env.ADMIN_NOMBRE;
  const pin = process.env.ADMIN_PIN;

  if (!nombre || !pin || !/^\d{6}$/.test(pin)) {
    console.error("Faltan ADMIN_NOMBRE y/o ADMIN_PIN (6 dígitos) como variables de entorno.");
    process.exit(1);
  }

  const pinHash = await bcrypt.hash(pin, 10);

  const admin = await db.usuario.create({
    data: { nombre, pinHash, pinLookup: calcularPinLookup(pin), rol: "SUPER_ADMIN" },
  });

  console.log("✅ Super Admin creado:", admin.nombre);
}

main().finally(() => db.$disconnect());
