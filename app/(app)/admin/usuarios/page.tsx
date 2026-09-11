// app/(app)/admin/usuarios/page.tsx
import { redirect } from "next/navigation";
import { db } from "../../../../lib/db";
import { getSession } from "../../../../lib/auth";
import PanelUsuariosAdmin from "../../../../components/PanelUsuariosAdmin";

export default async function AdminUsuariosPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.rol !== "SUPER_ADMIN") redirect("/login");

  const usuarios = await db.usuario.findMany({
    where: { rol: { in: ["ADMIN_TH", "COORDINADOR", "NOMINA", "SUPER_ADMIN"] } },
    orderBy: { numero: "asc" },
    include: {
      asignaciones: { include: { empresa: true, sitio: true, area: true } },
    },
  });

  const empresas = await db.empresa.findMany({
    orderBy: { nombre: "asc" },
    include: {
      sitios: {
        orderBy: { nombre: "asc" },
        include: { areas: { orderBy: { nombre: "asc" } } },
      },
    },
  });

  const usuariosSerializados = usuarios.map((u) => ({
    id: u.id,
    numero: u.numero,
    nombre: u.nombre,
    rol: u.rol,
    activo: u.activo,
    asignaciones: u.asignaciones.map((a) => ({
      id: a.id,
      etiqueta: a.area
        ? `${a.empresa?.nombre} · ${a.sitio?.nombre} · ${a.area.nombre}`
        : a.sitio
        ? `${a.empresa?.nombre} · ${a.sitio.nombre} (todas las áreas)`
        : `${a.empresa?.nombre} (toda la empresa)`,
    })),
  }));

  const empresasSerializadas = empresas.map((e) => ({
    id: e.id,
    nombre: e.nombre,
    sitios: e.sitios.map((s) => ({
      id: s.id,
      nombre: s.nombre,
      areas: s.areas.map((a) => ({ id: a.id, nombre: a.nombre })),
    })),
  }));

  return <PanelUsuariosAdmin usuarios={usuariosSerializados} empresas={empresasSerializadas} />;
}
