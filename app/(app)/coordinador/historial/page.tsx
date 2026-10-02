// app/(app)/coordinador/historial/page.tsx
import { redirect } from "next/navigation";
import { getSession } from "../../../../lib/auth";
import PanelHistorialConsulta from "../../../../components/PanelHistorialConsulta";

export default async function HistorialCoordinadorPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!["COORDINADOR", "SUPER_ADMIN"].includes(session.rol)) redirect("/login");

  return (
    <PanelHistorialConsulta
      api="/api/coordinador/historial"
      claveOrden="coordinador"
      conSupervisor
      conRevisadoPor
      opcionesEstado={[
        { value: "", label: "Todos" },
        { value: "REVISADO", label: "Revisada" },
        { value: "PAGADA", label: "Pagada" },
      ]}
    />
  );
}
