// app/(app)/mis-pasajes/page.tsx
import { redirect } from "next/navigation";
import { db } from "../../../lib/db";
import { getSession } from "../../../lib/auth";
import { obtenerColaboradorPorUsuarioId } from "../../../lib/colaboradorSesion";
import PanelColaborador from "../../../components/PanelColaborador";

export default async function MisPasajesPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const colaborador = await obtenerColaboradorPorUsuarioId(session.id);
  if (!colaborador) redirect("/login");

  const equipo = colaborador.esSupervisor
    ? await db.colaborador.findMany({
        where: { supervisorId: colaborador.id, estado: "ACTIVO" },
        select: { id: true, nombreCompleto: true },
        orderBy: { nombreCompleto: "asc" },
      })
    : [];

  const idsAConsultar = [colaborador.id, ...equipo.map((c) => c.id)];

  // Ninguna de las tres depende del resultado de otra: se piden a la vez.
  // Las rutas de TODO el equipo se traen en una sola consulta agrupada (en
  // vez de una por colaborador al abrir "Nueva solicitud") — con equipos
  // grandes eso eran decenas de pedidos, esto es uno solo, y ya viaja con
  // la página en vez de esperar a que el modal lo pida.
  const [solicitudes, rutasEquipoRaw] = await Promise.all([
    db.solicitudPasaje.findMany({
      where: {
        colaboradorId: { in: idsAConsultar },
        estado: { in: ["PENDIENTE", "APROBADA", "RECHAZADA"] },
      },
      orderBy: { fecha: "desc" },
      include: {
        ruta: true, // ya no hace falta "area", usamos el nombre propio de la ruta
        colaborador: { select: { nombreCompleto: true } },
      },
    }),
    db.ruta.findMany({
      where: { activo: true, colaboradoresExclusivos: { some: { id: { in: idsAConsultar } } } },
      include: { colaboradoresExclusivos: { where: { id: { in: idsAConsultar } }, select: { id: true } } },
      orderBy: { nombre: "asc" },
    }),
  ]);

  const rutasPorColaborador: Record<string, { id: string; valor: number; label: string }[]> = {};
  for (const id of idsAConsultar) rutasPorColaborador[id] = [];
  for (const ruta of rutasEquipoRaw) {
    const item = { id: ruta.id, valor: Number(ruta.valor), label: ruta.nombre };
    for (const c of ruta.colaboradoresExclusivos) rutasPorColaborador[c.id]?.push(item);
  }

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

  return (
    <PanelColaborador
      colaboradorId={colaborador.id}
      nombreCompleto={colaborador.nombreCompleto}
      esSupervisor={colaborador.esSupervisor}
      equipo={equipo}
      rutasPropias={rutasPorColaborador[colaborador.id] ?? []}
      rutasEquipo={rutasPorColaborador}
      solicitudes={solicitudesSerializadas}
    />
  );
}
