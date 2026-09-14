// app/api/admin/asignaciones-th/route.ts
// POST: Super Admin crea una asignación de TH a Empresa/Sitio/Área.

import { NextResponse } from "next/server";
import { db } from "../../../../lib/db";
import { getSession } from "../../../../lib/auth";

type AsignacionConNombres = {
  id: string;
  empresaId: string | null;
  sitioId: string | null;
  areaId: string | null;
  empresa: { nombre: string } | null;
  sitio: { nombre: string } | null;
  area: { nombre: string } | null;
};

// Mismo formato de etiqueta que se usa para mostrar las asignaciones ya
// guardadas (ver app/(app)/admin/usuarios/page.tsx), para que el mensaje
// de confirmación hable en los mismos términos que el resto de la pantalla.
function etiquetaDe(a: AsignacionConNombres) {
  if (a.area) return `${a.empresa?.nombre} · ${a.sitio?.nombre} · ${a.area.nombre}`;
  if (a.sitio) return `${a.empresa?.nombre} · ${a.sitio.nombre} (todas las áreas)`;
  return `${a.empresa?.nombre} (toda la empresa)`;
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.rol !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { usuarioId, empresaId, sitioId, areaId, confirmar } = await req.json();

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
  // De paso se guardan sus nombres para armar el mensaje de confirmación.
  let sitioNombre: string | null = null;
  let areaNombre: string | null = null;

  if (areaId) {
    const area = await db.area.findUnique({
      where: { id: areaId },
      select: { nombre: true, sitioId: true, sitio: { select: { nombre: true, empresaId: true } } },
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
    areaNombre = area.nombre;
    sitioNombre = area.sitio.nombre;
  } else if (sitioId) {
    const sitio = await db.sitioProductivo.findUnique({ where: { id: sitioId }, select: { nombre: true, empresaId: true } });
    if (!sitio) {
      return NextResponse.json({ error: "El sitio indicado no existe" }, { status: 400 });
    }
    if (sitio.empresaId !== empresaId) {
      return NextResponse.json({ error: "El sitio indicado no pertenece a esa empresa" }, { status: 400 });
    }
    sitioNombre = sitio.nombre;
  }

  // El acceso es en cascada (Área ⊂ Sitio ⊂ Empresa): una asignación más
  // amplia ya incluye todo lo que hay debajo. Cualquier cambio de alcance
  // frente a lo que el usuario ya tenía —para más amplio o para más
  // específico— se confirma antes de aplicarlo, porque en los dos casos
  // se pierde algo (lo específico que tenía, o lo amplio que tenía).
  const existentes = await db.asignacionTH.findMany({
    where: { usuarioId },
    include: { empresa: true, sitio: true, area: true },
  });

  const cubrePor = existentes.find((a) => {
    if (a.empresaId !== empresaId) return false;
    if (!a.sitioId) return true; // "a" ya es toda la empresa
    if (a.sitioId !== sitioId) return false; // "a" es de otro sitio, no aplica
    if (!a.areaId) return true; // "a" ya es ese sitio completo (cubre cualquier área)
    return a.areaId === areaId; // "a" es exactamente la misma área
  });

  const redundantes = existentes.filter((a) => {
    if (a.id === cubrePor?.id) return false;
    if (a.empresaId !== empresaId) return false;
    if (!sitioId) return true; // se agregó "toda la empresa": todo lo de abajo sobra
    if (!areaId) return a.sitioId === sitioId; // se agregó un sitio completo: sus áreas sobran
    return false; // se agregó un área: no hay nada más específico debajo
  });

  if ((cubrePor || redundantes.length > 0) && !confirmar) {
    const nuevaEtiqueta = etiquetaDe({
      id: "",
      empresaId,
      sitioId: sitioId || null,
      areaId: areaId || null,
      empresa,
      sitio: sitioNombre ? { nombre: sitioNombre } : null,
      area: areaNombre ? { nombre: areaNombre } : null,
    });
    return NextResponse.json(
      {
        error: "Este cambio de alcance necesita confirmación",
        requiereConfirmacion: true,
        tipo: cubrePor ? "achicar" : "ensanchar",
        nuevaEtiqueta,
        cubrePorEtiqueta: cubrePor ? etiquetaDe(cubrePor) : undefined,
        redundantesEtiquetas: redundantes.map(etiquetaDe),
      },
      { status: 409 }
    );
  }

  const idsAQuitar = [...redundantes.map((a) => a.id), ...(cubrePor ? [cubrePor.id] : [])];

  const [asignacion] = await db.$transaction([
    db.asignacionTH.create({ data: { usuarioId, empresaId, sitioId: sitioId || null, areaId: areaId || null } }),
    ...(idsAQuitar.length > 0 ? [db.asignacionTH.deleteMany({ where: { id: { in: idsAQuitar } } })] : []),
  ]);

  return NextResponse.json({ ...asignacion, quitadas: idsAQuitar.length }, { status: 201 });
}
