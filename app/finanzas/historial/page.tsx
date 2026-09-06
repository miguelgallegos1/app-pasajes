// app/finanzas/historial/page.tsx
import { redirect } from "next/navigation";
import { db } from "../../../lib/db";
import { getSession } from "../../../lib/auth";
import AppShell from "../../../components/AppShell";
import PanelHistorialFinanzas from "../../../components/PanelHistorialFinanzas";

export default async function HistorialFinanzasPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!["FINANZAS", "SUPER_ADMIN"].includes(session.rol)) redirect("/login");

  const usuario = await db.usuario.findUnique({ where: { id: session.id } });
  if (!usuario) redirect("/login");

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

  return (
    <AppShell rol={session.rol} nombreCompleto={usuario.nombre} fotoUrl={null}>
      <PanelHistorialFinanzas empresas={empresas} sitios={sitios} areas={areas} colaboradores={colaboradores} />
    </AppShell>
  );
}