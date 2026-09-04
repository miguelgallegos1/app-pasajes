// app/mis-pasajes/page.tsx
// Panel del colaborador: ve su historial y puede crear/eliminar solicitudes.

import { redirect } from "next/navigation";
import { db } from "../../lib/db";
import { getSession } from "../../lib/auth";
import PanelColaborador from "../../components/PanelColaborador";

export default async function MisPasajesPage() {
  const session = await getSession();

  // Si no hay sesión, o el rol no corresponde a un colaborador, al login
  if (!session) redirect("/login");

  const colaborador = await db.colaborador.findUnique({
    where: { usuarioId: session.id },
    include: {
      ruta: true,
      solicitudes: { orderBy: { fechaSolicitud: "desc" } },
    },
  });

  if (!colaborador) redirect("/login");

  // Convertimos los campos Decimal a number simple para poder pasarlos
  // a un componente cliente (Next.js no serializa el tipo Decimal de Prisma)
  const solicitudesSerializadas = colaborador.solicitudes.map((s) => ({
    id: s.id,
    frecuencia: s.frecuencia,
    cantidadPasajes: s.cantidadPasajes,
    montoTotal: Number(s.montoTotal),
    estado: s.estado,
    fechaSolicitud: s.fechaSolicitud.toISOString(),
    comentario: s.comentario,
  }));

  return (
    <PanelColaborador
      nombreCompleto={colaborador.nombreCompleto}
      nombreRuta={colaborador.ruta.nombre}
      solicitudes={solicitudesSerializadas}
    />
  );
}