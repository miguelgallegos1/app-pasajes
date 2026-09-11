// app/(app)/dashboard/page.tsx
import { redirect } from "next/navigation";
import { db } from "../../../lib/db";
import { getSession } from "../../../lib/auth";
import PanelDashboard from "../../../components/PanelDashboard";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!["ADMIN_TH", "COORDINADOR", "NOMINA", "JEFE", "SUPER_ADMIN"].includes(session.rol)) redirect("/login");

  // Listas completas (no acotadas al alcance del rol): el filtro es
  // opcional y el backend igual combina lo elegido aquí con el alcance
  // real del usuario, así que mostrar el árbol completo de la empresa
  // solo afecta qué opciones ve en el combo, no qué datos puede traer.
  const [empresas, sitios, areas] = await Promise.all([
    db.empresa.findMany({ select: { id: true, nombre: true }, orderBy: { nombre: "asc" } }),
    db.sitioProductivo.findMany({
      select: { id: true, nombre: true, empresaId: true },
      orderBy: { nombre: "asc" },
    }),
    db.area.findMany({ select: { id: true, nombre: true, sitioId: true }, orderBy: { nombre: "asc" } }),
  ]);

  return <PanelDashboard empresas={empresas} sitios={sitios} areas={areas} />;
}
