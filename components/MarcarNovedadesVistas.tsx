// components/MarcarNovedadesVistas.tsx
// Al abrir /novedades, las que se están mostrando quedan como vistas en
// este navegador (así el aviso flotante no vuelve a aparecer por ellas).

"use client";

import { useEffect } from "react";
import { marcarNovedadesVistas } from "../lib/novedadesVistas";

export default function MarcarNovedadesVistas({ usuarioId, ids }: { usuarioId: string; ids: string[] }) {
  const clave = ids.join(",");
  useEffect(() => {
    marcarNovedadesVistas(usuarioId, clave.split(",").filter(Boolean));
  }, [usuarioId, clave]);
  return null;
}
