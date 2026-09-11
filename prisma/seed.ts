// prisma/seed.ts
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { calcularPinLookup } from "../lib/pin";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

async function main() {
  const empresa = await db.empresa.create({
    data: { nombre: "GROWFLOWERS PRODUCCIONES S.A.", ruc: "1790012345001" },
  });

  const sitio = await db.sitioProductivo.create({
    data: { nombre: "CAYAMBE", direccion: "Vía Cayambe - Tabacundo", empresaId: empresa.id },
  });

  const areaProduccion = await db.area.create({
    data: { nombre: "Producción", sitioId: sitio.id },
  });
  const areaCultivo = await db.area.create({
    data: { nombre: "Cultivo", sitioId: sitio.id },
  });

  const rutaProduccion = await db.ruta.create({
    data: { empresaId: empresa.id, sitioId: sitio.id, areaId: areaProduccion.id, valor: 0.45 },
  });
  const rutaCultivo = await db.ruta.create({
    data: { empresaId: empresa.id, sitioId: sitio.id, areaId: areaCultivo.id, valor: 0.5 },
  });

  const pinHashAdmin = await bcrypt.hash("123456", 10);
  const pinHashTH = await bcrypt.hash("111111", 10);
  const pinHashNomina = await bcrypt.hash("333333", 10);
  const pinHashCoordinador = await bcrypt.hash("555555", 10);
  const pinHashJefe = await bcrypt.hash("666666", 10);
  const pinHashSupervisor = await bcrypt.hash("444444", 10);
  const pinHashColab = await bcrypt.hash("222222", 10);

  await db.usuario.create({
    data: {
      nombre: "Miguel Gallegos (Super Admin)",
      email: "superadmin@empresa.com",
      pinHash: pinHashAdmin,
      pinLookup: calcularPinLookup("123456"),
      rol: "SUPER_ADMIN",
    },
  });

  // Talento Humano — se le asignan AMBAS áreas (demuestra el caso de
  // una jefatura responsable de más de un área)
  const usuarioTH = await db.usuario.create({
    data: {
      nombre: "María Torres (TH)",
      email: "th@empresa.com",
      pinHash: pinHashTH,
      pinLookup: calcularPinLookup("111111"),
      rol: "ADMIN_TH",
    },
  });
  await db.asignacionTH.createMany({
    data: [
      { usuarioId: usuarioTH.id, areaId: areaProduccion.id },
      { usuarioId: usuarioTH.id, areaId: areaCultivo.id },
    ],
  });

  await db.usuario.create({
    data: {
      nombre: "Carlos Pago (Nómina)",
      email: "nomina@empresa.com",
      pinHash: pinHashNomina,
      pinLookup: calcularPinLookup("333333"),
      rol: "NOMINA",
    },
  });

  // Jefe — sin restricción de alcance, solo ve informes (Dashboard +
  // Historial General), sin acciones sobre las solicitudes.
  await db.usuario.create({
    data: {
      nombre: "Roberto Vega (Jefe)",
      email: "jefe@empresa.com",
      pinHash: pinHashJefe,
      pinLookup: calcularPinLookup("666666"),
      rol: "JEFE",
    },
  });

  // Coordinador — igual que TH, se le asigna al menos un área para poder
  // ver/revisar solicitudes dentro de su alcance.
  const usuarioCoordinador = await db.usuario.create({
    data: {
      nombre: "Lucía Ramírez (Coordinadora)",
      email: "coordinador@empresa.com",
      pinHash: pinHashCoordinador,
      pinLookup: calcularPinLookup("555555"),
      rol: "COORDINADOR",
    },
  });
  await db.asignacionTH.create({
    data: { usuarioId: usuarioCoordinador.id, areaId: areaProduccion.id },
  });

  const usuarioSupervisor = await db.usuario.create({
    data: {
      nombre: "Ana Rodríguez (Supervisora)",
      email: "supervisor@empresa.com",
      pinHash: pinHashSupervisor,
      pinLookup: calcularPinLookup("444444"),
      rol: "COLABORADOR",
      colaborador: {
        create: {
          nombreCompleto: "Ana Rodríguez",
          apellidos: "Rodríguez",
          nombres: "Ana",
          sitioId: sitio.id,
          areaId: areaProduccion.id,
          esSupervisor: true,
        },
      },
    },
    include: { colaborador: true },
  });

  const usuarioColaborador = await db.usuario.create({
    data: {
      nombre: "Juan Pérez",
      email: "juan.perez@empresa.com",
      pinHash: pinHashColab,
      pinLookup: calcularPinLookup("222222"),
      rol: "COLABORADOR",
      colaborador: {
        create: {
          nombreCompleto: "Juan Pérez",
          apellidos: "Pérez",
          nombres: "Juan",
          sitioId: sitio.id,
          areaId: areaProduccion.id,
          supervisorId: usuarioSupervisor.colaborador!.id,
        },
      },
    },
    include: { colaborador: true },
  });

  const ayer = new Date();
  ayer.setDate(ayer.getDate() - 1);

  await db.solicitudPasaje.createMany({
    data: [
      {
        codigo: "DEM2",
        colaboradorId: usuarioColaborador.colaborador!.id,
        rutaId: rutaProduccion.id,
        fecha: ayer,
        montoTotal: rutaProduccion.valor,
        estado: "PENDIENTE",
        observaciones: "Turno extendido por inventario",
      },
      {
        codigo: "DEM3",
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
  console.log("ADMIN_TH     → th@empresa.com / PIN: 111111 (asignada a Producción y Cultivo)");
  console.log("NOMINA       → nomina@empresa.com / PIN: 333333");
  console.log("COORDINADOR  → coordinador@empresa.com / PIN: 555555 (asignada a Producción)");
  console.log("JEFE         → jefe@empresa.com / PIN: 666666");
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