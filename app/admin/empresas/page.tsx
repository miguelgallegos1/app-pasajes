// app/admin/empresas/page.tsx
import { redirect } from "next/navigation";
import { db } from "../../../lib/db";
import { getSession } from "../../../lib/auth";
import AppShell from "../../../components/AppShell";
import PanelEmpresas from "../../../components/PanelEmpresas";

export default async function EmpresasPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.rol !== "SUPER_ADMIN") redirect("/login");

  const usuario = await db.usuario.findUnique({ where: { id: session.id } });
  if (!usuario) redirect("/login");

  const empresas = await db.empresa.findMany({
    orderBy: { nombre: "asc" },
    include: {
      sitios: {
        orderBy: { nombre: "asc" },
        include: { areas: { orderBy: { nombre: "asc" } } },
      },
    },
  });

  return (
    <AppShell rol={session.rol} nombreCompleto={usuario.nombre} fotoUrl={null}>
      <PanelEmpresas empresas={empresas} />
    </AppShell>
  );
}
