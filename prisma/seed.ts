// prisma/seed.ts
//
// Este script llena la base de datos con datos de PRUEBA:
// una empresa, un sitio, dos áreas, dos rutas, y un usuario de cada rol.
// Se ejecuta con: npx prisma db seed
//
// NOTA: cada vez que lo corras, va a intentar CREAR estos registros de nuevo.
// Si ya existen, te va a dar error de "unique constraint". Para reiniciar
// todo desde cero, hay que borrar los datos en Prisma Studio primero.

import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL }); 
const db = new PrismaClient({ adapter }); 

async function main() {
  // 1. Empresa de prueba
  const empresa = await db.empresa.create({
    data: { nombre: "GROWFLOWERS PRODUCCIONES S.A.", ruc: "1790012345001" },
  });

  // 2. Sitio productivo de esa empresa
  const sitio = await db.sitioProductivo.create({
    data: {
      nombre: "CAYAMBE",
      direccion: "Av. Galo Plaza Lasso",
      empresaId: empresa.id,
    },
  });

  // 3. Áreas dentro del sitio
  const areaProduccion = await db.area.create({
    data: { nombre: "Producción", sitioId: sitio.id },
  });
  const areaLogistica = await db.area.create({
    data: { nombre: "Cultivo", sitioId: sitio.id },
  });

  // 4. Rutas de transporte con su monto base
  const rutaNorte = await db.ruta.create({
    data: { nombre: "Tabacundo - Cayambe", montoBase: 0.45 },
  });
  const rutaSur = await db.ruta.create({
    data: { nombre: "Tabacundo - Y de Tabacundo", montoBase: 0.5 },
  });

  // 5. Los PINes se hashean ANTES de guardarlos (nunca en texto plano)
  const pinHashAdmin = await bcrypt.hash("123456", 10);
  const pinHashTH = await bcrypt.hash("111111", 10);
  const pinHashColab = await bcrypt.hash("222222", 10);
  const pinHashFin = await bcrypt.hash("333333", 10);

  // 6. Usuario Super Admin
  await db.usuario.create({
    data: {
      nombre: "Miguel Gallegos (Super Admin)",
      email: "superadmin@empresa.com",
      pinHash: pinHashAdmin,
      rol: "SUPER_ADMIN",
    },
  });

  // 7. Usuario de Talento Humano
  await db.usuario.create({
    data: {
      nombre: "María Torres (TH)",
      email: "th@empresa.com",
      pinHash: pinHashTH,
      rol: "ADMIN_TH",
    },
  });

  // 8. Usuario de Finanzas
  await db.usuario.create({
    data: {
      nombre: "Carlos Pago (Finanzas)",
      email: "finanzas@empresa.com",
      pinHash: pinHashFin,
      rol: "FINANZAS",
    },
  });

  // 9. Usuario Colaborador (junto con su registro de Colaborador asociado)
  const usuarioColaborador = await db.usuario.create({
    data: {
      nombre: "Juan Pérez",
      email: "juan.perez@empresa.com",
      pinHash: pinHashColab,
      rol: "COLABORADOR",
      colaborador: {
        create: {
          nombreCompleto: "Juan Pérez",
          rutaId: rutaNorte.id,
          sitioId: sitio.id,
          areaId: areaProduccion.id,
        },
      },
    },
    include: { colaborador: true },
  });

  // 10. Un par de solicitudes de ejemplo, en distintos estados
  await db.solicitudPasaje.createMany({
    data: [
      {
        colaboradorId: usuarioColaborador.colaborador!.id,
        frecuencia: "SEMANAL",
        cantidadPasajes: 1,
        montoTotal: 3.5,
        estado: "PENDIENTE",
      },
      {
        colaboradorId: usuarioColaborador.colaborador!.id,
        frecuencia: "MENSUAL",
        cantidadPasajes: 1,
        montoTotal: 15.4,
        estado: "APROBADA",
        fechaAprobacion: new Date(),
      },
    ],
  });

  console.log("✅ Seed completado con éxito");
  console.log("-----------------------------------");
  console.log("SUPER_ADMIN  → superadmin@empresa.com / PIN: 123456");
  console.log("ADMIN_TH     → th@empresa.com / PIN: 111111");
  console.log("FINANZAS     → finanzas@empresa.com / PIN: 333333");
  console.log("COLABORADOR  → juan.perez@empresa.com / PIN: 222222");
  console.log("-----------------------------------");
}

main()
  .catch((e) => {
    console.error("❌ Error al ejecutar el seed:", e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());