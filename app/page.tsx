import { redirect } from "next/navigation";
import { getSession } from "../lib/auth";

const INICIO_POR_ROL: Record<string, string> = {
  COLABORADOR: "/mis-pasajes",
  ADMIN_TH: "/dashboard",
  FINANZAS: "/dashboard",
  SUPER_ADMIN: "/dashboard",
};

export default async function Home() {
  const session = await getSession();
  redirect(session ? INICIO_POR_ROL[session.rol] ?? "/login" : "/login");
}
