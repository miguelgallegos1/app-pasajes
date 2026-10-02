// app/(app)/jefe/historial/page.tsx
import { redirect } from "next/navigation";
import { getSession } from "../../../../lib/auth";
import PanelHistorialConsulta from "../../../../components/PanelHistorialConsulta";

export default async function HistorialJefePage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!["JEFE", "SUPER_ADMIN"].includes(session.rol)) redirect("/login");

  return (
    <PanelHistorialConsulta
      api="/api/jefe/historial"
      claveOrden="jefe"
      conSupervisor={false}
      opcionesEstado={[
        { value: "", label: "Todos" },
        { value: "PENDIENTE", label: "Pendiente" },
        { value: "APROBADA", label: "Aprobada" },
        { value: "RECHAZADA", label: "Rechazada" },
        { value: "REVISADO", label: "Revisada" },
        { value: "PAGADA", label: "Pagada" },
      ]}
    />
  );
}
