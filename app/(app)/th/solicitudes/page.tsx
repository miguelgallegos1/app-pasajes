// app/(app)/th/solicitudes/page.tsx
// Dirección anterior de "Crear solicitud" de TH: ahora es Mis solicitudes
// -> Registrar. Se redirige para no romper enlaces o marcadores guardados.

import { redirect } from "next/navigation";

export default function CrearSolicitudTHAnterior() {
  redirect("/th/mis-solicitudes");
}
