// app/(app)/th/colaboradores/page.tsx
import { redirect } from "next/navigation";
import { db } from "../../../../lib/db";
import { getSession } from "../../../../lib/auth";
import { obtenerCondicionColaboradorTH, obtenerAreasPermitidasTH } from "../../../../lib/alcanceTH";
import PanelColaboradoresTH from "../../../../components/PanelColaboradoresTH";

export default async function ColaboradoresPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!["ADMIN_TH", "SUPER_ADMIN"].includes(session.rol)) redirect("/login");

  const { sinRestriccion, condicion } = await obtenerCondicionColaboradorTH(session.id, session.rol);
  const sinAsignaciones = condicion === null;

  const colaboradores = sinAsignaciones
    ? []
    : await db.colaborador.findMany({
        where: sinRestriccion ? {} : (condicion as any),
        include: {
          area: { include: { sitio: { include: { empresa: true } } } },
          supervisor: { select: { nombreCompleto: true } },
          _count: { select: { solicitudes: true } },
        },
        orderBy: { nombreCompleto: "asc" },
      });

  const areasPermitidas = await obtenerAreasPermitidasTH(session.id, session.rol);

  const colaboradoresSerializados = colaboradores.map((c) => ({
    id: c.id,
    nombreCompleto: c.nombreCompleto,
    estado: c.estado,
    esSupervisor: c.esSupervisor,
    supervisorNombre: c.supervisor?.nombreCompleto ?? null,
    areaId: c.areaId,
    areaLabel: `${c.area.sitio.empresa.nombre} · ${c.area.sitio.nombre} · ${c.area.nombre}`,
    tieneSolicitudes: c._count.solicitudes > 0,
  }));

  const areasSerializadas = areasPermitidas.map((a) => ({
    id: a.id,
    label: `${a.sitio.empresa.nombre} · ${a.sitio.nombre} · ${a.nombre}`,
  }));

  const supervisoresDisponibles = colaboradoresSerializados
    .filter((c) => c.esSupervisor && c.estado === "ACTIVO")
    .map((c) => ({ id: c.id, label: c.nombreCompleto }));

  return (
    <PanelColaboradoresTH
      colaboradores={colaboradoresSerializados}
      areasDisponibles={areasSerializadas}
      supervisoresDisponibles={supervisoresDisponibles}
      sinAsignaciones={sinAsignaciones}
    />
  );
}
