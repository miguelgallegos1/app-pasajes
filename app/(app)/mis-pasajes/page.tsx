// app/(app)/mis-pasajes/page.tsx
// Solo valida sesión acá: los datos se piden desde el cliente (ver
// PanelColaborador) para que la pantalla se muestre de inmediato en vez de
// bloquear la navegación esperando esa consulta en el servidor — esta es
// la pantalla que más gente usa, así que es la que más importa.

import { redirect } from "next/navigation";
import { getSession } from "../../../lib/auth";
import PanelColaborador from "../../../components/PanelColaborador";

export default async function MisPasajesPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return <PanelColaborador />;
}
