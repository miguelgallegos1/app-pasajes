// app/(app)/nomina/pagos/page.tsx
import { redirect } from "next/navigation";
import { db } from "../../../../lib/db";
import { getSession } from "../../../../lib/auth";
import PanelNomina from "../../../../components/PanelNomina";

export default async function PagosPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!["NOMINA", "SUPER_ADMIN"].includes(session.rol)) redirect("/login");

  const revisadas = await db.solicitudPasaje.findMany({
    where: { estado: "REVISADO" },
    orderBy: { fechaRevision: "asc" },
    include: {
      colaborador: { select: { nombreCompleto: true } },
      ruta: { include: { area: { include: { sitio: { include: { empresa: true } } } } } },
    },
  });

  const revisadasSerializadas = revisadas.map((s) => ({
    id: s.id,
    codigo: s.codigo,
    fecha: s.fecha.toISOString(),
    fechaRevision: s.fechaRevision?.toISOString() ?? null,
    montoTotal: Number(s.montoTotal),
    colaboradorId: s.colaboradorId,
    nombreColaborador: s.colaborador.nombreCompleto,
    empresaId: s.ruta.area.sitio.empresaId,
    empresaNombre: s.ruta.area.sitio.empresa.nombre,
    sitioId: s.ruta.area.sitioId,
    sitioNombre: s.ruta.area.sitio.nombre,
    areaId: s.ruta.areaId,
    areaNombre: s.ruta.area.nombre,
    rutaId: s.rutaId,
    rutaNombre: s.ruta.nombre,
  }));

  return <PanelNomina esSuperAdmin={session.rol === "SUPER_ADMIN"} revisadas={revisadasSerializadas} />;
}
