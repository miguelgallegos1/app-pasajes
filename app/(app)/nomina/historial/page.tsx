// app/(app)/nomina/historial/page.tsx
import { redirect } from "next/navigation";
import { db } from "../../../../lib/db";
import { getSession } from "../../../../lib/auth";
import PanelHistorialNomina from "../../../../components/PanelHistorialNomina";

export default async function HistorialNominaPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!["NOMINA", "SUPER_ADMIN"].includes(session.rol)) redirect("/login");

  const [empresas, sitios, areas, colaboradores] = await Promise.all([
    db.empresa.findMany({ select: { id: true, nombre: true }, orderBy: { nombre: "asc" } }),
    db.sitioProductivo.findMany({
      select: { id: true, nombre: true, empresaId: true },
      orderBy: { nombre: "asc" },
    }),
    db.area.findMany({ select: { id: true, nombre: true, sitioId: true }, orderBy: { nombre: "asc" } }),
    db.colaborador.findMany({
      select: { id: true, nombreCompleto: true, areaId: true },
      orderBy: { nombreCompleto: "asc" },
    }),
  ]);

  return <PanelHistorialNomina empresas={empresas} sitios={sitios} areas={areas} colaboradores={colaboradores} />;
}
