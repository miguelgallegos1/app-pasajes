// app/mis-pasajes/page.tsx
import { redirect } from "next/navigation";
import { db } from "../../lib/db";
import { getSession } from "../../lib/auth";
import PanelColaborador from "../../components/PanelColaborador";

export default async function MisPasajesPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const colaborador = await db.colaborador.findUnique({
    where: { usuarioId: session.id },
  });
  if (!colaborador) redirect("/login");

  const equipo = colaborador.esSupervisor
    ? await db.colaborador.findMany({
        where: { supervisorId: colaborador.id, estado: "ACTIVO" },
        select: { id: true, nombreCompleto: true },
        orderBy: { nombreCompleto: "asc" },
      })
    : [];

  // Si es Supervisor, la tabla trae SUS solicitudes + las de todo su equipo.
  // Si es colaborador normal, solo las suyas.
  const idsAConsultar = [colaborador.id, ...equipo.map((c) => c.id)];

  const solicitudes = await db.solicitudPasaje.findMany({
    where: {
      colaboradorId: { in: idsAConsultar },
      estado: { in: ["PENDIENTE", "APROBADA"] },
    },
    orderBy: { fecha: "desc" },
    include: {
      ruta: { include: { area: true } },
      colaborador: { select: { nombreCompleto: true } },
    },
  });

  const rutasPropias = await db.ruta.findMany({
    where: { sitioId: colaborador.sitioId, areaId: colaborador.areaId, activo: true },
    include: { area: true },
    orderBy: { valor: "asc" },
  });

  const solicitudesSerializadas = solicitudes.map((s) => ({
    id: s.id,
    fecha: s.fecha.toISOString(),
    fechaSolicitud: s.fechaSolicitud.toISOString(),
    montoTotal: Number(s.montoTotal),
    estado: s.estado,
    observaciones: s.observaciones,
    rutaLabel: s.ruta.area.nombre,
    nombreColaborador: s.colaborador.nombreCompleto,
  }));

  const rutasPropiasSerializadas = rutasPropias.map((r) => ({
    id: r.id,
    valor: Number(r.valor),
    label: r.area.nombre,
  }));

  return (
    <PanelColaborador
      colaboradorId={colaborador.id}
      nombreCompleto={colaborador.nombreCompleto}
      fotoUrl={colaborador.fotoUrl}
      esSupervisor={colaborador.esSupervisor}
      equipo={equipo}
      rutasPropias={rutasPropiasSerializadas}
      solicitudes={solicitudesSerializadas}
    />
  );
}