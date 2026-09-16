// app/(app)/admin/carga-masiva/page.tsx
import { redirect } from "next/navigation";
import { getSession } from "../../../../lib/auth";
import PanelCargaMasiva from "../../../../components/PanelCargaMasiva";

export default async function CargaMasivaPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.rol !== "SUPER_ADMIN") redirect("/login");

  return <PanelCargaMasiva />;
}
