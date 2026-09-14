// app/api/admin/asignaciones-th/route.ts
// POST: Super Admin crea una asignación de TH a Empresa/Sitio/Área.

import { NextResponse } from "next/server";
import { db } from "../../../../lib/db";
import { getSession } from "../../../../lib/auth";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.rol !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { usuarioId, empresaId, sitioId, areaId, reemplazar } = await req.json();

  if (!usuarioId || !empresaId) {
    return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
  }

  const usuario = await db.usuario.findUnique({ where: { id: usuarioId } });
  if (!usuario || !["ADMIN_TH", "COORDINADOR"].includes(usuario.rol)) {
    return NextResponse.json({ error: "Ese usuario no es de Talento Humano ni Coordinador" }, { status: 400 });
  }

  const empresa = await db.empresa.findUnique({ where: { id: empresaId } });
  if (!empresa) {
    return NextResponse.json({ error: "La empresa indicada no existe" }, { status: 400 });
  }

  // Se valida que sitio/área realmente existan y formen una jerarquía
  // consistente con la empresa indicada (evita asignaciones "sueltas" que
  // no calzan entre sí y que lib/alcanceTH.ts luego usaría para filtrar).
  if (areaId) {
    const area = await db.area.findUnique({
      where: { id: areaId },
      select: { sitioId: true, sitio: { select: { empresaId: true } } },
    });
    if (!area) {
      return NextResponse.json({ error: "El área indicada no existe" }, { status: 400 });
    }
    if (sitioId && area.sitioId !== sitioId) {
      return NextResponse.json({ error: "El área indicada no pertenece a ese sitio" }, { status: 400 });
    }
    if (area.sitio.empresaId !== empresaId) {
      return NextResponse.json({ error: "El área indicada no pertenece a esa empresa" }, { status: 400 });
    }
  } else if (sitioId) {
    const sitio = await db.sitioProductivo.findUnique({ where: { id: sitioId }, select: { empresaId: true } });
    if (!sitio) {
      return NextResponse.json({ error: "El sitio indicado no existe" }, { status: 400 });
    }
    if (sitio.empresaId !== empresaId) {
      return NextResponse.json({ error: "El sitio indicado no pertenece a esa empresa" }, { status: 400 });
    }
  }

  // El acceso es en cascada (Área ⊂ Sitio ⊂ Empresa): una asignación más
  // amplia ya incluye todo lo que hay debajo, así que no tiene sentido
  // convivir con asignaciones más específicas de esa misma rama.
  const existentes = await db.asignacionTH.findMany({ where: { usuarioId } });

  const cubrePor = existentes.find((a) => {
    if (a.empresaId !== empresaId) return false;
    if (!a.sitioId) return true; // "a" ya es toda la empresa
    if (a.sitioId !== sitioId) return false; // "a" es de otro sitio, no aplica
    if (!a.areaId) return true; // "a" ya es ese sitio completo (cubre cualquier área)
    return a.areaId === areaId; // "a" es exactamente la misma área
  });

  // Pedir algo más específico que lo que ya se tiene es, en el fondo, una
  // decisión de ACHICAR el acceso (se pierde lo que quedaba fuera de lo
  // nuevo) — eso no se hace sin que el Super Admin lo confirme a propósito.
  if (cubrePor && !reemplazar) {
    return NextResponse.json({ error: "Ya tiene una asignación más amplia que incluye este alcance", cubrePorId: cubrePor.id }, { status: 409 });
  }

  // Todo lo que queda "por debajo" de la nueva asignación pasa a ser
  // redundante y se quita para no dejar el listado con ramas duplicadas.
  // Si además se confirmó un reemplazo, la asignación más amplia que
  // cubría esto también se quita (por eso hacía falta la confirmación:
  // el usuario pierde el acceso a todo lo que quedaba fuera de lo nuevo).
  const idsRedundantes = existentes
    .filter((a) => {
      if (a.empresaId !== empresaId) return false;
      if (!sitioId) return true; // se agregó "toda la empresa": todo lo de abajo sobra
      if (!areaId) return a.sitioId === sitioId; // se agregó un sitio completo: sus áreas sobran
      return false; // se agregó un área: no hay nada más específico debajo
    })
    .map((a) => a.id);
  if (cubrePor && reemplazar) idsRedundantes.push(cubrePor.id);

  const [asignacion] = await db.$transaction([
    db.asignacionTH.create({ data: { usuarioId, empresaId, sitioId: sitioId || null, areaId: areaId || null } }),
    ...(idsRedundantes.length > 0 ? [db.asignacionTH.deleteMany({ where: { id: { in: idsRedundantes } } })] : []),
  ]);

  return NextResponse.json({ ...asignacion, quitadas: idsRedundantes.length }, { status: 201 });
}
