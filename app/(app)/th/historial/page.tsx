// app/(app)/th/historial/page.tsx
import { redirect } from "next/navigation";
import { getSession } from "../../../../lib/auth";
import PanelHistorialTH from "../../../../components/PanelHistorialTH";

export default async function HistorialTHPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!["ADMIN_TH", "SUPER_ADMIN"].includes(session.rol)) redirect("/login");

  return <PanelHistorialTH />;
}
