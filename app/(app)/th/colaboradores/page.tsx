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
          rutasExclusivas: { select: { id: true } },
          _count: { select: { solicitudes: true } },
        },
        orderBy: { numero: "asc" },
      });

  const areasPermitidas = await obtenerAreasPermitidasTH(session.id, session.rol);
  const areaIds = areasPermitidas.map((a) => a.id);

  // Todas las rutas de las áreas que este TH administra, para el selector
  // de "rutas exclusivas" al crear/editar un colaborador.
  const rutas = areaIds.length
    ? await db.ruta.findMany({
        where: { areaId: { in: areaIds }, activo: true },
        select: { id: true, nombre: true, areaId: true },
        orderBy: { nombre: "asc" },
      })
    : [];

  const colaboradoresSerializados = colaboradores.map((c) => ({
    id: c.id,
    numero: c.numero,
    nombreCompleto: c.nombreCompleto,
    apellidos: c.apellidos,
    nombres: c.nombres,
    codigoNomina: c.codigoNomina,
    estado: c.estado,
    esSupervisor: c.esSupervisor,
    supervisorNombre: c.supervisor?.nombreCompleto ?? null,
    areaId: c.areaId,
    areaLabel: `${c.area.sitio.empresa.nombre} · ${c.area.sitio.nombre} · ${c.area.nombre}`,
    tieneSolicitudes: c._count.solicitudes > 0,
    rutaIdsExclusivas: c.rutasExclusivas.map((r) => r.id),
  }));

  const areasSerializadas = areasPermitidas.map((a) => ({
    id: a.id,
    label: `${a.sitio.empresa.nombre} · ${a.sitio.nombre} · ${a.nombre}`,
  }));

  const rutasSerializadas = rutas.map((r) => ({ id: r.id, nombre: r.nombre, areaId: r.areaId }));

  const supervisoresDisponibles = colaboradoresSerializados
    .filter((c) => c.esSupervisor && c.estado === "ACTIVO")
    .map((c) => ({ id: c.id, label: c.nombreCompleto }));

  return (
    <PanelColaboradoresTH
      colaboradores={colaboradoresSerializados}
      areasDisponibles={areasSerializadas}
      supervisoresDisponibles={supervisoresDisponibles}
      rutasDisponibles={rutasSerializadas}
      sinAsignaciones={sinAsignaciones}
    />
  );
}
