// app/(app)/th/rutas/asignaciones/page.tsx
// Pantalla dedicada para asignar rutas exclusivas a un colaborador puntual
// (reemplaza el combobox limitado que vivía dentro del modal de Colaboradores).

import { redirect } from "next/navigation";
import { db } from "../../../../../lib/db";
import { getSession } from "../../../../../lib/auth";
import { obtenerCondicionColaboradorTH, obtenerAreasPermitidasTH } from "../../../../../lib/alcanceTH";
import PanelAsignacionRutas from "../../../../../components/PanelAsignacionRutas";

export default async function AsignacionRutasPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!["ADMIN_TH", "SUPER_ADMIN"].includes(session.rol)) redirect("/login");

  // Independientes entre sí: se piden a la vez en vez de una tras otra.
  const [{ sinRestriccion, condicion }, areasPermitidas] = await Promise.all([
    obtenerCondicionColaboradorTH(session.id, session.rol),
    obtenerAreasPermitidasTH(session.id, session.rol),
  ]);
  const sinAsignaciones = condicion === null;
  const areaIds = areasPermitidas.map((a) => a.id);

  const [colaboradores, rutas] = await Promise.all([
    sinAsignaciones
      ? Promise.resolve([])
      : db.colaborador.findMany({
          where: sinRestriccion ? {} : (condicion as any),
          include: {
            area: { select: { nombre: true, sitioId: true } },
            rutasExclusivas: { select: { id: true } },
          },
          orderBy: { numero: "asc" },
        }),
    areaIds.length
      ? db.ruta.findMany({
          where: { areaId: { in: areaIds }, activo: true },
          select: { id: true, nombre: true, valor: true, areaId: true },
          orderBy: { nombre: "asc" },
        })
      : Promise.resolve([]),
  ]);

  // Empresas, sitios y áreas únicos (derivados de las áreas permitidas)
  // para armar los filtros en cascada del lado izquierdo.
  const empresasMapa = new Map<string, { id: string; nombre: string }>();
  const sitiosMapa = new Map<string, { id: string; nombre: string; empresaId: string }>();
  const areasMapa = new Map<string, { id: string; nombre: string; sitioId: string; empresaId: string }>();
  for (const a of areasPermitidas) {
    empresasMapa.set(a.sitio.empresa.id, { id: a.sitio.empresa.id, nombre: a.sitio.empresa.nombre });
    sitiosMapa.set(a.sitioId, { id: a.sitioId, nombre: a.sitio.nombre, empresaId: a.sitio.empresa.id });
    areasMapa.set(a.id, { id: a.id, nombre: a.nombre, sitioId: a.sitioId, empresaId: a.sitio.empresa.id });
  }

  const areaPorId = new Map(areasMapa.entries());

  const colaboradoresSerializados = colaboradores.map((c) => {
    const area = areaPorId.get(c.areaId);
    return {
      id: c.id,
      numero: c.numero,
      nombreCompleto: c.nombreCompleto,
      codigoNomina: c.codigoNomina,
      estado: c.estado,
      areaId: c.areaId,
      areaNombre: c.area.nombre,
      sitioId: c.area.sitioId,
      empresaId: area?.empresaId ?? "",
      rutaIdsExclusivas: c.rutasExclusivas.map((r) => r.id),
    };
  });

  const rutasSerializadas = rutas.map((r) => ({
    id: r.id,
    nombre: r.nombre,
    valor: Number(r.valor),
    areaId: r.areaId,
  }));

  return (
    <PanelAsignacionRutas
      colaboradores={colaboradoresSerializados}
      rutas={rutasSerializadas}
      empresas={Array.from(empresasMapa.values())
        .sort((a, b) => a.nombre.localeCompare(b.nombre))
        .map((e) => ({ id: e.id, label: e.nombre }))}
      sitios={Array.from(sitiosMapa.values()).sort((a, b) => a.nombre.localeCompare(b.nombre))}
      areas={Array.from(areasMapa.values()).sort((a, b) => a.nombre.localeCompare(b.nombre))}
      sinAsignaciones={sinAsignaciones}
    />
  );
}
