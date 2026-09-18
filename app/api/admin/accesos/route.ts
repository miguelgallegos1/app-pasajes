// app/api/admin/accesos/route.ts
// GET: bitácora de logins exitosos (PIN o biometría), más reciente
// primero. Filtrable por nombre, rol y método. Solo Super Admin.

import { NextResponse } from "next/server";
import { db } from "../../../../lib/db";
import { getSession } from "../../../../lib/auth";

const POR_PAGINA = 20;
type RolValido = "SUPER_ADMIN" | "ADMIN_TH" | "COORDINADOR" | "COLABORADOR" | "NOMINA" | "JEFE";
const ROLES_VALIDOS: RolValido[] = ["SUPER_ADMIN", "ADMIN_TH", "COORDINADOR", "COLABORADOR", "NOMINA", "JEFE"];

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

  const usuarioFiltro: { nombre?: { contains: string; mode: "insensitive" }; rol?: RolValido } = {};
  if (busqueda) usuarioFiltro.nombre = { contains: busqueda, mode: "insensitive" };
  if (rol && ROLES_VALIDOS.includes(rol as RolValido)) usuarioFiltro.rol = rol as RolValido;

  const where = {
    ...(Object.keys(usuarioFiltro).length > 0 ? { usuario: usuarioFiltro } : {}),
    ...(metodo === "PIN" || metodo === "BIOMETRIA" ? { metodo } : {}),
  };

  const [items, total] = await Promise.all([
    db.registroAcceso.findMany({
      where,
      include: { usuario: { select: { nombre: true, rol: true, sesionesRevocadasEn: true } } },
      orderBy: { creadoEn: "desc" },
      skip: (pagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
    }),
    db.registroAcceso.count({ where }),
  ]);

  return NextResponse.json({
    items: items.map((r) => ({
      id: r.id,
      usuarioId: r.usuarioId,
      nombreUsuario: r.usuario.nombre,
      rol: r.usuario.rol,
      metodo: r.metodo,
      ip: r.ip,
      userAgent: r.userAgent,
      creadoEn: r.creadoEn.toISOString(),
      // Esta fila en particular quedó invalidada por una revocación
      // posterior — no significa que el usuario esté "bloqueado" para
      // siempre, solo que ESA sesión puntual ya no sirve.
      revocada: !!r.usuario.sesionesRevocadasEn && r.creadoEn < r.usuario.sesionesRevocadasEn,
    })),
    total,
    totalPaginas: Math.max(1, Math.ceil(total / POR_PAGINA)),
    pagina,
  });
}
