// app/(app)/mis-pasajes/copiar/page.tsx
// "Copiar rutas" como página propia del menú (antes vivía en un modal
// dentro de Mis Pasajes).

import { redirect } from "next/navigation";
import { db } from "../../../../lib/db";
import { getSession } from "../../../../lib/auth";
import PanelCopiarRutas from "../../../../components/PanelCopiarRutas";

export default async function CopiarRutasPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const colaborador = await db.colaborador.findUnique({ where: { usuarioId: session.id } });
  if (!colaborador) redirect("/login");

  return <PanelCopiarRutas esSupervisor={colaborador.esSupervisor} />;
}
