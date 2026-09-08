// app/(app)/mis-pasajes/page.tsx
import { redirect } from "next/navigation";
import { db } from "../../../lib/db";
import { getSession } from "../../../lib/auth";
import { condicionRutasVisibles } from "../../../lib/rutas";
import PanelColaborador from "../../../components/PanelColaborador";

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

  const idsAConsultar = [colaborador.id, ...equipo.map((c) => c.id)];

  const solicitudes = await db.solicitudPasaje.findMany({
    where: {
      colaboradorId: { in: idsAConsultar },
      estado: { in: ["PENDIENTE", "APROBADA", "RECHAZADA"] },
    },
    orderBy: { fecha: "desc" },
    include: {
      ruta: true, // ya no hace falta "area", usamos el nombre propio de la ruta
      colaborador: { select: { nombreCompleto: true } },
    },
  });

  const rutasPropias = await db.ruta.findMany({
    where: condicionRutasVisibles(colaborador),
    orderBy: { nombre: "asc" },
  });

  const solicitudesSerializadas = solicitudes.map((s) => ({
    id: s.id,
    codigo: s.codigo,
    colaboradorId: s.colaboradorId,
    rutaId: s.rutaId,
    fecha: s.fecha.toISOString(),
    fechaSolicitud: s.fechaSolicitud.toISOString(),
    montoTotal: Number(s.montoTotal),
    estado: s.estado,
    observaciones: s.observaciones,
    rutaLabel: s.ruta.nombre,
    nombreColaborador: s.colaborador.nombreCompleto,
  }));

  const rutasPropiasSerializadas = rutasPropias.map((r) => ({
    id: r.id,
    valor: Number(r.valor),
    label: r.nombre,
  }));

  return (
    <PanelColaborador
      colaboradorId={colaborador.id}
      nombreCompleto={colaborador.nombreCompleto}
      esSupervisor={colaborador.esSupervisor}
      equipo={equipo}
      rutasPropias={rutasPropiasSerializadas}
      solicitudes={solicitudesSerializadas}
    />
  );
}
