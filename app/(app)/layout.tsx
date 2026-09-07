// app/(app)/layout.tsx
// Layout compartido por TODAS las pantallas internas (protegidas por
// sesión). Al vivir en un layout en vez de repetirse en cada page.tsx,
// el sidebar/header (AppShell) queda montado una sola vez y ya no se
// vuelve a crear de cero en cada clic del menú — solo cambia el
// contenido de adentro, que es lo único que cada página necesita traer.

import { redirect } from "next/navigation";
import { getSession, obtenerPerfilSesion } from "../../lib/auth";
import AppShell from "../../components/AppShell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const perfil = await obtenerPerfilSesion(session);

  return (
    <AppShell rol={session.rol} nombreCompleto={perfil.nombre} fotoUrl={perfil.fotoUrl}>
      {children}
    </AppShell>
  );
}
