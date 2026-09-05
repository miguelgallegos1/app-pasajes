// prisma/seed.ts
//
// Llena la base de datos con datos de PRUEBA usando la NUEVA estructura:
// - Rutas ahora se definen por Empresa + Sitio + Área (valor fijo)
// - Colaboradores ya no tienen una ruta fija, la eligen por solicitud
// - Se incluye un Supervisor de ejemplo con un colaborador en su equipo
//
// Se ejecuta con: npx prisma db seed

import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

async function main() {
  // 1. Empresa
  const empresa = await db.empresa.create({
    data: { nombre: "GROWFLOWERS PRODUCCIONES S.A.", ruc: "1790012345001" },
  });

  // 2. Sitio productivo
  const sitio = await db.sitioProductivo.create({
    data: {
      nombre: "CAYAMBE",
      direccion: "Vía Cayambe - Tabacundo",
      empresaId: empresa.id,
    },
  });

  // 3. Áreas
  const areaProduccion = await db.area.create({
    data: { nombre: "Producción", sitioId: sitio.id },
  });
  const areaCultivo = await db.area.create({
    data: { nombre: "Cultivo", sitioId: sitio.id },
  });

  // 4. Rutas: UNA por cada combinación Empresa + Sitio + Área, con valor fijo
  const rutaProduccion = await db.ruta.create({
    data: {
      empresaId: empresa.id,
      sitioId: sitio.id,
      areaId: areaProduccion.id,
      valor: 0.45,
    },
  });
  const rutaCultivo = await db.ruta.create({
    data: {
      empresaId: empresa.id,
      sitioId: sitio.id,
      areaId: areaCultivo.id,
      valor: 0.5,
    },
  });

  // 5. PINes hasheados (nunca en texto plano)
  const pinHashAdmin = await bcrypt.hash("123456", 10);
  const pinHashTH = await bcrypt.hash("111111", 10);
  const pinHashFin = await bcrypt.hash("333333", 10);
  const pinHashSupervisor = await bcrypt.hash("444444", 10);
  const pinHashColab = await bcrypt.hash("222222", 10);

  // 6. Super Admin
  await db.usuario.create({
    data: {
      nombre: "Miguel Gallegos (Super Admin)",
      email: "superadmin@empresa.com",
      pinHash: pinHashAdmin,
      rol: "SUPER_ADMIN",
    },
  });

  // 7. Talento Humano
  await db.usuario.create({
    data: {
      nombre: "María Torres (TH)",
      email: "th@empresa.com",
      pinHash: pinHashTH,
      rol: "ADMIN_TH",
    },
  });

  // 8. Finanzas
  await db.usuario.create({
    data: {
      nombre: "Carlos Pago (Finanzas)",
      email: "finanzas@empresa.com",
      pinHash: pinHashFin,
      rol: "FINANZAS",
    },
  });

  // 9. Supervisor (es un Colaborador con esSupervisor = true)
  const usuarioSupervisor = await db.usuario.create({
    data: {
      nombre: "Ana Rodríguez (Supervisora)",
      email: "supervisor@empresa.com",
      pinHash: pinHashSupervisor,
      rol: "COLABORADOR", // el supervisor sigue siendo rol COLABORADOR, solo con la bandera activada
      colaborador: {
        create: {
          nombreCompleto: "Ana Rodríguez",
          sitioId: sitio.id,
          areaId: areaProduccion.id,
          esSupervisor: true,
        },
      },
    },
    include: { colaborador: true },
  });

  // 10. Colaborador normal (Juan Pérez), asignado al equipo de Ana
  const usuarioColaborador = await db.usuario.create({
    data: {
      nombre: "Juan Pérez",
      email: "juan.perez@empresa.com",
      pinHash: pinHashColab,
      rol: "COLABORADOR",
      colaborador: {
        create: {
          nombreCompleto: "Juan Pérez",
          sitioId: sitio.id,
          areaId: areaProduccion.id,
          supervisorId: usuarioSupervisor.colaborador!.id, // pertenece al equipo de Ana
        },
      },
    },
    include: { colaborador: true },
  });

  // 11. Solicitudes de ejemplo para Juan (una de ayer PENDIENTE, una de hoy APROBADA)
  const ayer = new Date();
  ayer.setDate(ayer.getDate() - 1);

  await db.solicitudPasaje.createMany({
    data: [
      {
        colaboradorId: usuarioColaborador.colaborador!.id,
        rutaId: rutaProduccion.id,
        fecha: ayer,
        montoTotal: rutaProduccion.valor,
        estado: "PENDIENTE",
      },
      {
        colaboradorId: usuarioColaborador.colaborador!.id,
        rutaId: rutaProduccion.id,
        fecha: new Date(),
        montoTotal: rutaProduccion.valor,
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
  console.log("SUPERVISOR   → Ana Rodríguez / PIN: 444444");
  console.log("COLABORADOR  → Juan Pérez / PIN: 222222 (equipo de Ana)");
  console.log("-----------------------------------");
}

main()
  .catch((e) => {
    console.error("❌ Error al ejecutar el seed:", e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());