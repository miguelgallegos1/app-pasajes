// app/api/admin/parametros/route.ts
// GET/PUT de los parámetros generales: cuántos días atrás puede elegir el
// calendario de nueva solicitud, y en qué pantallas se muestra
// "Seleccionar todas (N)". Solo Super Admin. El PUT acepta cualquiera de
// los dos (cada tarjeta de la pantalla guarda solo lo suyo).

import { NextResponse } from "next/server";
import { getSession } from "../../../../lib/auth";
import {
  obtenerDiasAtrasSolicitud,
  actualizarDiasAtrasSolicitud,
  obtenerSeleccionTotal,
  actualizarSeleccionTotal,
} from "../../../../lib/parametros";

export async function GET() {
  const session = await getSession();
  if (!session || session.rol !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const [diasAtrasSolicitud, seleccionTotal] = await Promise.all([obtenerDiasAtrasSolicitud(), obtenerSeleccionTotal()]);
  return NextResponse.json({ diasAtrasSolicitud, seleccionTotal });
}

export async function PUT(req: Request) {
  const session = await getSession();
  if (!session || session.rol !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { diasAtrasSolicitud, seleccionTotal } = await req.json().catch(() => ({}));

  if (seleccionTotal !== undefined) {
    const valido =
      seleccionTotal !== null &&
      typeof seleccionTotal === "object" &&
      ["aprobar", "revisar", "pagar"].every((k) => typeof seleccionTotal[k] === "boolean");
    if (!valido) {
      return NextResponse.json({ error: "Valores de selección inválidos" }, { status: 400 });
    }
    const { aprobar, revisar, pagar } = seleccionTotal;
    await actualizarSeleccionTotal({ aprobar, revisar, pagar });
    return NextResponse.json({ seleccionTotal: { aprobar, revisar, pagar } });
  }

  if (
    typeof diasAtrasSolicitud !== "number" ||
    !Number.isInteger(diasAtrasSolicitud) ||
    diasAtrasSolicitud < 0 ||
    diasAtrasSolicitud > 365
  ) {
    return NextResponse.json({ error: "El valor debe ser un número entero entre 0 y 365" }, { status: 400 });
  }

  await actualizarDiasAtrasSolicitud(diasAtrasSolicitud);
  return NextResponse.json({ diasAtrasSolicitud });
}
