// app/api/admin/accesos/route.ts
// GET: bitácora de accesos VIGENTES (sesión activa, no revocada). Una
// sesión cerrada (por un nuevo login o por "Cerrar sesión" desde este
// panel) no aporta nada a un Super Admin viendo "quién tiene acceso ahora
// mismo", así que ni se devuelve — no tiene sentido remar contra el
// filtro en el cliente. Más reciente primero. Filtrable por nombre, rol
// y método. Solo Super Admin.
//
// La condición "activa" compara dos columnas de tablas distintas
// (creadoEn de RegistroAcceso contra sesionesRevocadasEn de Usuario) —
// Prisma no puede expresarlo en su "where" declarativo, así que esta
// consulta va en SQL crudo. Los valores interpolados con Prisma.sql
// quedan parametrizados de verdad (no son concatenación de texto), así
// que es tan seguro como usar el cliente normal de Prisma.

import { NextResponse } from "next/server";
import { Prisma } from "../../../../app/generated/prisma/client";
import { db } from "../../../../lib/db";
import { getSession } from "../../../../lib/auth";

const POR_PAGINA = 20;
type RolValido = "SUPER_ADMIN" | "ADMIN_TH" | "COORDINADOR" | "COLABORADOR" | "NOMINA" | "JEFE";
const ROLES_VALIDOS: RolValido[] = ["SUPER_ADMIN", "ADMIN_TH", "COORDINADOR", "COLABORADOR", "NOMINA", "JEFE"];

type Fila = {
  id: string;
  usuarioId: string;
  nombreUsuario: string;
  rol: string;
  metodo: string;
  ip: string | null;
  userAgent: string | null;
  creadoEn: Date;
};

export async function GET(req: Request) {
  const session = await getSession();
  if (!session || session.rol !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const busqueda = searchParams.get("busqueda")?.trim() ?? "";
  const rol = searchParams.get("rol");
  const metodo = searchParams.get("metodo");
  const pagina = Math.max(1, Number(searchParams.get("pagina") ?? "1"));

  // Una fila está activa si nunca hubo revocación posterior, o si este
  // login puntual es igual o más nuevo que la última revocación.
  const condiciones: Prisma.Sql[] = [
    Prisma.sql`(u."sesionesRevocadasEn" IS NULL OR ra."creadoEn" >= u."sesionesRevocadasEn")`,
  ];
  if (busqueda) condiciones.push(Prisma.sql`u."nombre" ILIKE ${`%${busqueda}%`}`);
  if (rol && ROLES_VALIDOS.includes(rol as RolValido)) condiciones.push(Prisma.sql`u."rol" = ${rol}::"Rol"`);
  if (metodo === "PIN" || metodo === "BIOMETRIA") condiciones.push(Prisma.sql`ra."metodo" = ${metodo}`);
  const dondeSql = Prisma.sql`WHERE ${Prisma.join(condiciones, " AND ")}`;

  const [filas, conteo] = await Promise.all([
    db.$queryRaw<Fila[]>(Prisma.sql`
      SELECT ra."id", ra."usuarioId", u."nombre" AS "nombreUsuario", u."rol", ra."metodo", ra."ip", ra."userAgent", ra."creadoEn"
      FROM "RegistroAcceso" ra
      JOIN "Usuario" u ON u."id" = ra."usuarioId"
      ${dondeSql}
      ORDER BY ra."creadoEn" DESC
      LIMIT ${POR_PAGINA} OFFSET ${(pagina - 1) * POR_PAGINA}
    `),
    db.$queryRaw<{ total: bigint }[]>(Prisma.sql`
      SELECT COUNT(*)::bigint AS total
      FROM "RegistroAcceso" ra
      JOIN "Usuario" u ON u."id" = ra."usuarioId"
      ${dondeSql}
    `),
  ]);

  const total = Number(conteo[0]?.total ?? 0);

  return NextResponse.json({
    items: filas.map((r) => ({
      id: r.id,
      usuarioId: r.usuarioId,
      nombreUsuario: r.nombreUsuario,
      rol: r.rol,
      metodo: r.metodo,
      ip: r.ip,
      userAgent: r.userAgent,
      creadoEn: new Date(r.creadoEn).toISOString(),
    })),
    total,
    totalPaginas: Math.max(1, Math.ceil(total / POR_PAGINA)),
    pagina,
  });
}
