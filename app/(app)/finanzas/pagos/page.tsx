// app/(app)/finanzas/pagos/page.tsx
import { redirect } from "next/navigation";
import { db } from "../../../../lib/db";
import { getSession } from "../../../../lib/auth";
import PanelFinanzas from "../../../../components/PanelFinanzas";

export default async function PagosPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!["FINANZAS", "SUPER_ADMIN"].includes(session.rol)) redirect("/login");

  const aprobadas = await db.solicitudPasaje.findMany({
    where: { estado: "APROBADA" },
    orderBy: { fechaAprobacion: "asc" },
    include: {
      colaborador: { select: { nombreCompleto: true } },
      ruta: { include: { area: { include: { sitio: { include: { empresa: true } } } } } },
    },
  });

  const aprobadasSerializadas = aprobadas.map((s) => ({
    id: s.id,
    codigo: s.codigo,
    fecha: s.fecha.toISOString(),
    fechaAprobacion: s.fechaAprobacion?.toISOString() ?? null,
    montoTotal: Number(s.montoTotal),
    colaboradorId: s.colaboradorId,
    nombreColaborador: s.colaborador.nombreCompleto,
    empresaId: s.ruta.area.sitio.empresaId,
    empresaNombre: s.ruta.area.sitio.empresa.nombre,
    sitioId: s.ruta.area.sitioId,
    sitioNombre: s.ruta.area.sitio.nombre,
    areaId: s.ruta.areaId,
    areaNombre: s.ruta.area.nombre,
    rutaNombre: s.ruta.nombre,
  }));

  return <PanelFinanzas esSuperAdmin={session.rol === "SUPER_ADMIN"} aprobadas={aprobadasSerializadas} />;
}
