// app/(app)/jefe/historial/page.tsx
import { redirect } from "next/navigation";
import { db } from "../../../../lib/db";
import { getSession } from "../../../../lib/auth";
import PanelHistorialJefe from "../../../../components/PanelHistorialJefe";

export default async function HistorialJefePage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!["JEFE", "SUPER_ADMIN"].includes(session.rol)) redirect("/login");

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

  return <PanelHistorialJefe empresas={empresas} sitios={sitios} areas={areas} colaboradores={colaboradores} />;
}
