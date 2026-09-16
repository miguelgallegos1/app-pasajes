// app/(app)/th/colaboradores/asignaciones/page.tsx
// Pantalla dedicada para asignar colaboradores a un supervisor (reemplaza
// el combo "Reporta a" enterrado en el modal de Colaboradores, que además
// no precargaba el supervisor actual al editar).

import { redirect } from "next/navigation";
import { db } from "../../../../../lib/db";
import { getSession } from "../../../../../lib/auth";
import { obtenerCondicionColaboradorTH, obtenerAreasPermitidasTH } from "../../../../../lib/alcanceTH";
import PanelAsignacionEquipo from "../../../../../components/PanelAsignacionEquipo";

export default async function AsignacionEquipoPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!["ADMIN_TH", "SUPER_ADMIN"].includes(session.rol)) redirect("/login");

  // Independientes entre sí: se piden a la vez en vez de una tras otra.
  const [{ sinRestriccion, condicion }, areasPermitidas] = await Promise.all([
    obtenerCondicionColaboradorTH(session.id, session.rol),
    obtenerAreasPermitidasTH(session.id, session.rol),
  ]);
  const sinAsignaciones = condicion === null;

  const colaboradores = sinAsignaciones
    ? []
    : await db.colaborador.findMany({
        where: sinRestriccion ? {} : (condicion as any),
        select: {
          id: true,
          numero: true,
          nombreCompleto: true,
          codigoNomina: true,
          estado: true,
          esSupervisor: true,
          supervisorId: true,
          areaId: true,
          area: { select: { nombre: true, sitioId: true } },
        },
        orderBy: { numero: "asc" },
      });

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
      esSupervisor: c.esSupervisor,
      supervisorId: c.supervisorId,
      areaId: c.areaId,
      areaNombre: c.area.nombre,
      sitioId: c.area.sitioId,
      empresaId: area?.empresaId ?? "",
    };
  });

  return (
    <PanelAsignacionEquipo
      colaboradores={colaboradoresSerializados}
      empresas={Array.from(empresasMapa.values())
        .sort((a, b) => a.nombre.localeCompare(b.nombre))
        .map((e) => ({ id: e.id, label: e.nombre }))}
      sitios={Array.from(sitiosMapa.values()).sort((a, b) => a.nombre.localeCompare(b.nombre))}
      areas={Array.from(areasMapa.values()).sort((a, b) => a.nombre.localeCompare(b.nombre))}
      sinAsignaciones={sinAsignaciones}
    />
  );
}
