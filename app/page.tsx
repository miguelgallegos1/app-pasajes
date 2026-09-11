import { redirect } from "next/navigation";
import { getSession } from "../lib/auth";
import { INICIO_POR_ROL } from "../lib/roles";

export default async function Home() {
  const session = await getSession();
  redirect(session ? INICIO_POR_ROL[session.rol] ?? "/login" : "/login");
}
