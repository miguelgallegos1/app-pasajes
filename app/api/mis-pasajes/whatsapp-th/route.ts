// app/api/mis-pasajes/whatsapp-th/route.ts
// Número de WhatsApp de TH para el botón flotante de contacto del
// colaborador logueado, resuelto en cascada (ver lib/whatsappTH.ts).
// Endpoint propio y liviano (no se suma a la consulta ya cacheada de
// obtenerColaboradorPorUsuarioId, que usa también el layout) para no
// pagar este costo en cada navegación — solo se pide cuando el botón
// flotante se monta.

import { NextResponse } from "next/server";
import { db } from "../../../../lib/db";
import { getSession } from "../../../../lib/auth";
import { obtenerColaboradorPorUsuarioId } from "../../../../lib/colaboradorSesion";
import { resolverWhatsappTH, limpiarNumeroWhatsapp } from "../../../../lib/whatsappTH";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const colaborador = await obtenerColaboradorPorUsuarioId(session.id);
  if (!colaborador) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const area = await db.area.findUnique({
    where: { id: colaborador.areaId },
    select: {
      whatsapp: true,
      sitio: { select: { whatsapp: true, empresa: { select: { whatsapp: true } } } },
    },
  });

  const numero = area ? resolverWhatsappTH(area) : null;
  return NextResponse.json({ whatsapp: numero ? limpiarNumeroWhatsapp(numero) : null });
}
