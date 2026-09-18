// app/(app)/admin/accesos/page.tsx
import { redirect } from "next/navigation";
import { getSession } from "../../../../lib/auth";
import PanelAccesos from "../../../../components/PanelAccesos";

export default async function AdminAccesosPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.rol !== "SUPER_ADMIN") redirect("/login");

  return <PanelAccesos />;
}
