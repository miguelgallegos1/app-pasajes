// lib/cargaGlobal.tsx
// Contexto para que loading.tsx (mientras el SERVIDOR arma la pantalla
// nueva) y cada Panel (mientras trae sus propios datos del cliente)
// "avisen" que hay una carga en curso, en vez de pintar cada uno su
// propia franja naranja. AppShell.tsx es el único que de verdad decide
// mostrarla u ocultarla, con UNA sola instancia de BarraCarga montada
// siempre — así su animación nunca se reinicia al pasar de una fase de
// la carga a la otra (antes cada fase montaba su propia copia del
// componente, y el navegador reiniciaba la animación desde cero al
// cambiar de una a otra, viéndose como un corte brusco).

"use client";

import { createContext, useContext, useEffect, useId } from "react";

export const CargaGlobalContext = createContext<((id: string, cargando: boolean) => void) | null>(null);

// Cada consumidor (loading.tsx, o el cargandoInicial de un Panel) llama
// esto con su propio estado. Se anuncia resuelto solo al desmontarse, así
// no queda la barra pegada si el usuario navega afuera antes de que
// termine de cargar.
export function useReportarCarga(cargando: boolean) {
  const id = useId();
  const reportar = useContext(CargaGlobalContext);
  useEffect(() => {
    reportar?.(id, cargando);
    return () => reportar?.(id, false);
  }, [id, reportar, cargando]);
}
