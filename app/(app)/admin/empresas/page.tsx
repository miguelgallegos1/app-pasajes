// app/(app)/admin/empresas/page.tsx
import { redirect } from "next/navigation";
import { db } from "../../../../lib/db";
import { getSession } from "../../../../lib/auth";
import PanelEmpresas from "../../../../components/PanelEmpresas";

export default async function EmpresasPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.rol !== "SUPER_ADMIN") redirect("/login");

  const empresas = await db.empresa.findMany({
    orderBy: { nombre: "asc" },
    include: {
      sitios: {
        orderBy: { nombre: "asc" },
        include: { areas: { orderBy: { nombre: "asc" } } },
      },
    },
  });

  return <PanelEmpresas empresas={empresas} />;
}
