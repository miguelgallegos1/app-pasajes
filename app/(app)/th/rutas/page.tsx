// app/(app)/th/rutas/page.tsx
import { redirect } from "next/navigation";
import { db } from "../../../../lib/db";
import { getSession } from "../../../../lib/auth";
import { obtenerAreasPermitidasTH } from "../../../../lib/alcanceTH";
import PanelRutasTH from "../../../../components/PanelRutasTH";

export default async function RutasPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!["ADMIN_TH", "SUPER_ADMIN"].includes(session.rol)) redirect("/login");

  const areasPermitidas = await obtenerAreasPermitidasTH(session.id, session.rol);
  const areaIds = areasPermitidas.map((a) => a.id);

  const rutas = areaIds.length
    ? await db.ruta.findMany({
        where: { areaId: { in: areaIds } },
        include: {
          area: { include: { sitio: { include: { empresa: true } } } },
          _count: { select: { solicitudes: true } },
        },
        orderBy: { nombre: "asc" },
      })
    : [];

  const rutasSerializadas = rutas.map((r) => ({
    id: r.id,
    nombre: r.nombre,
    valor: Number(r.valor),
    activo: r.activo,
    areaLabel: `${r.area.sitio.empresa.nombre} · ${r.area.sitio.nombre} · ${r.area.nombre}`,
    tieneSolicitudes: r._count.solicitudes > 0,
  }));

  const areasSerializadas = areasPermitidas.map((a) => ({
    id: a.id,
    label: `${a.sitio.empresa.nombre} · ${a.sitio.nombre} · ${a.nombre}`,
  }));

  return (
    <PanelRutasTH
      rutas={rutasSerializadas}
      areasDisponibles={areasSerializadas}
      sinAsignaciones={areasPermitidas.length === 0}
    />
  );
}
