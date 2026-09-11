// app/api/colaboradores/[id]/route.ts
// PATCH: edita nombre/área/supervisor/estado/PIN de un colaborador.
// DELETE: elimina PERMANENTEMENTE, solo si no tiene solicitudes ni
// gente a su cargo (para no romper el historial ni dejar huérfanos).

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "../../../../lib/db";
import { getSession } from "../../../../lib/auth";
import { obtenerAreasPermitidasTH } from "../../../../lib/alcanceTH";
import { calcularPinLookup } from "../../../../lib/pin";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || !["ADMIN_TH", "SUPER_ADMIN"].includes(session.rol)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id } = await params;
  const { apellidos, nombres, codigoNomina, areaId, esSupervisor, supervisorId, estado, rutaIds, pin } = await req.json();

  const colaborador = await db.colaborador.findUnique({ where: { id } });
  if (!colaborador) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const areasPermitidas = await obtenerAreasPermitidasTH(session.id, session.rol);
  const idsPermitidos = new Set(areasPermitidas.map((a) => a.id));

  if (!idsPermitidos.has(colaborador.areaId)) {
    return NextResponse.json({ error: "Ese colaborador no está en tu alcance" }, { status: 403 });
  }

  if (codigoNomina !== undefined && !codigoNomina?.trim()) {
    return NextResponse.json({ error: "El código de nómina es obligatorio" }, { status: 400 });
  }
  if ((apellidos !== undefined || nombres !== undefined) && (!apellidos?.trim() || !nombres?.trim())) {
    return NextResponse.json({ error: "Apellidos y Nombres son obligatorios" }, { status: 400 });
  }

  // Resetear el PIN es opcional al editar (a diferencia de crear, donde es
  // obligatorio): si no viene en el body, el PIN actual no se toca — el
  // hash nunca se puede "recuperar", solo reemplazar por uno nuevo.
  let pinHashNuevo: string | null = null;
  let pinLookupNuevo: string | null = null;
  if (pin !== undefined) {
    if (typeof pin !== "string" || !/^\d{6}$/.test(pin)) {
      return NextResponse.json({ error: "El PIN debe tener exactamente 6 dígitos" }, { status: 400 });
    }
    pinLookupNuevo = calcularPinLookup(pin);
    const yaExiste = await db.usuario.findFirst({
      where: { pinLookup: pinLookupNuevo, id: { not: colaborador.usuarioId } },
    });
    if (yaExiste) {
      return NextResponse.json({ error: "Ese PIN ya está en uso, elige otro" }, { status: 400 });
    }
    const usuariosSinMigrar = await db.usuario.findMany({
      where: { pinLookup: null, id: { not: colaborador.usuarioId } },
      select: { pinHash: true },
    });
    for (const u of usuariosSinMigrar) {
      if (await bcrypt.compare(pin, u.pinHash)) {
        return NextResponse.json({ error: "Ese PIN ya está en uso, elige otro" }, { status: 400 });
      }
    }
    pinHashNuevo = await bcrypt.hash(pin, 10);
  }

  // Mismo chequeo que al crear: el supervisor debe existir, estar marcado
  // como supervisor, no ser el propio colaborador, y estar dentro del
  // alcance de este TH.
  if (supervisorId) {
    if (supervisorId === id) {
      return NextResponse.json({ error: "Un colaborador no puede ser su propio supervisor" }, { status: 400 });
    }
    const supervisor = await db.colaborador.findUnique({ where: { id: supervisorId } });
    if (!supervisor || !supervisor.esSupervisor || !idsPermitidos.has(supervisor.areaId)) {
      return NextResponse.json({ error: "El supervisor indicado no es válido" }, { status: 400 });
    }
  }

  const data: Record<string, unknown> = {};
  if (apellidos?.trim() && nombres?.trim()) {
    const apellidosNormalizados = apellidos.trim().toUpperCase();
    const nombresNormalizados = nombres.trim().toUpperCase();
    data.apellidos = apellidosNormalizados;
    data.nombres = nombresNormalizados;
    data.nombreCompleto = `${apellidosNormalizados} ${nombresNormalizados}`;
  }
  if (codigoNomina?.trim()) data.codigoNomina = codigoNomina.trim().toUpperCase();
  if (typeof esSupervisor === "boolean") data.esSupervisor = esSupervisor;
  if (supervisorId !== undefined) data.supervisorId = supervisorId || null;
  if (estado === "ACTIVO" || estado === "INACTIVO") data.estado = estado;

  if (areaId && areaId !== colaborador.areaId) {
    const nuevaArea = areasPermitidas.find((a) => a.id === areaId);
    if (!nuevaArea) {
      return NextResponse.json({ error: "Esa área no está en tu alcance" }, { status: 403 });
    }
    data.areaId = nuevaArea.id;
    data.sitioId = nuevaArea.sitioId;
  }

  const areaFinalId = (data.areaId as string | undefined) ?? colaborador.areaId;

  try {
    if (pinHashNuevo && pinLookupNuevo) {
      await db.usuario.update({
        where: { id: colaborador.usuarioId },
        data: { pinHash: pinHashNuevo, pinLookup: pinLookupNuevo },
      });
    }

    const actualizado = await db.colaborador.update({ where: { id }, data });

    // Solo tocamos las rutas exclusivas si el formulario mandó la lista
    // (las llamadas parciales, como cambiar solo el estado, no la incluyen).
    if (Array.isArray(rutaIds)) {
      const rutaIdsValidos = (
        await db.ruta.findMany({ where: { id: { in: rutaIds }, areaId: areaFinalId }, select: { id: true } })
      ).map((r) => r.id);

      // Libera las que ya eran suyas y se desmarcaron; asigna las nuevas.
      await db.$transaction([
        db.ruta.updateMany({
          where: { colaboradorExclusivoId: id, id: { notIn: rutaIdsValidos } },
          data: { colaboradorExclusivoId: null },
        }),
        ...(rutaIdsValidos.length > 0
          ? [
              db.ruta.updateMany({
                where: { id: { in: rutaIdsValidos } },
                data: { colaboradorExclusivoId: id },
              }),
            ]
          : []),
      ]);
    }

    return NextResponse.json(actualizado);
  } catch (e: any) {
    if (e.code === "P2002") {
      return NextResponse.json({ error: "Ese código de nómina ya está en uso por otro colaborador" }, { status: 400 });
    }
    throw e;
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || !["ADMIN_TH", "SUPER_ADMIN"].includes(session.rol)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id } = await params;

  const colaborador = await db.colaborador.findUnique({
    where: { id },
    include: { _count: { select: { solicitudes: true } } },
  });
  if (!colaborador) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const areasPermitidas = await obtenerAreasPermitidasTH(session.id, session.rol);
  if (!areasPermitidas.some((a) => a.id === colaborador.areaId)) {
    return NextResponse.json({ error: "Ese colaborador no está en tu alcance" }, { status: 403 });
  }

  if (colaborador._count.solicitudes > 0) {
    return NextResponse.json(
      { error: "No se puede eliminar: tiene solicitudes registradas. Solo puedes desactivarlo." },
      { status: 400 }
    );
  }

  const tieneEquipo = await db.colaborador.count({ where: { supervisorId: id } });
  if (tieneEquipo > 0) {
    return NextResponse.json(
      { error: "No se puede eliminar: tiene colaboradores a su cargo. Reasígnalos primero." },
      { status: 400 }
    );
  }

  // Todo en una sola transacción: si el colaborador tiene una passkey
  // registrada (CredencialBiometrica tiene FK obligatoria hacia Usuario,
  // sin cascada), borrar colaborador y usuario en pasos separados podía
  // dejar el borrado a medias (colaborador ya borrado, usuario.delete
  // fallando por la FK y quedando una cuenta de login huérfana).
  await db.$transaction([
    db.credencialBiometrica.deleteMany({ where: { usuarioId: colaborador.usuarioId } }),
    db.colaborador.delete({ where: { id } }),
    db.usuario.delete({ where: { id: colaborador.usuarioId } }),
  ]);

  return NextResponse.json({ ok: true });
}