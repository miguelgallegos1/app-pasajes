// components/MarcarNovedadesVistas.tsx
// Al abrir /novedades, las que se están mostrando quedan como vistas en
// este navegador (así el aviso flotante no vuelve a aparecer por ellas).

"use client";

import { useEffect } from "react";
import { marcarNovedadesVistas } from "../lib/novedadesVistas";

export default function MarcarNovedadesVistas({ ids }: { ids: string[] }) {
  const clave = ids.join(",");
  useEffect(() => {
    marcarNovedadesVistas(clave.split(",").filter(Boolean));
  }, [clave]);
  return null;
}
