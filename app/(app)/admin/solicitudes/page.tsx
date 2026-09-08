// app/(app)/admin/solicitudes/page.tsx
import { redirect } from "next/navigation";
import { db } from "../../../../lib/db";
import { getSession } from "../../../../lib/auth";
import PanelControlSolicitudes from "../../../../components/PanelControlSolicitudes";

export default async function ControlSolicitudesPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.rol !== "SUPER_ADMIN") redirect("/login");

  const colaboradores = await db.colaborador.findMany({
    select: { id: true, nombreCompleto: true },
    orderBy: { nombreCompleto: "asc" },
  });

  return <PanelControlSolicitudes colaboradores={colaboradores} />;
}
