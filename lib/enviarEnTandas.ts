// lib/enviarEnTandas.ts
// Envía una selección grande a un endpoint "-lote" (aprobar/revisar/pagar)
// en tandas de TANDA_LOTE, una tras otra: cada petición es liviana y la
// base nunca queda ocupada con un bloque enorme. El endpoint responde los
// `ids` que de verdad procesó, así la pantalla quita SOLO esos y puede
// avisar de los que no (cambiaron de estado mientras tanto). Si una tanda
// falla, se conserva lo ya procesado en las anteriores.

// Debe coincidir con MAX_POR_LOTE de los endpoints aprobar/revisar/pagar-lote.
export const TANDA_LOTE = 500;

export async function enviarEnTandas(
  url: string,
  ids: string[],
  mensajeError: string
): Promise<{ procesados: Set<string>; fallo: string | null }> {
  const procesados = new Set<string>();
  try {
    for (let i = 0; i < ids.length; i += TANDA_LOTE) {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: ids.slice(i, i + TANDA_LOTE) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        // "Ninguna ... válida" en una tanda no corta las siguientes.
        if (res.status === 400 && typeof data.error === "string" && data.error.startsWith("Ninguna")) continue;
        return { procesados, fallo: data.error ?? mensajeError };
      }
      (data.ids as string[]).forEach((id) => procesados.add(id));
    }
  } catch {
    return { procesados, fallo: "No se pudo conectar. Revisa tu conexión e inténtalo de nuevo." };
  }
  return { procesados, fallo: null };
}

// Mensaje final para el toast según cómo terminó el envío. `accion` en
// participio plural ("aprobadas", "revisadas", "marcadas como pagadas").
export function resumenEnvio(
  total: number,
  procesados: number,
  fallo: string | null,
  accion: string
): { tipo: "exito" | "advertencia" | "error"; mensaje: string } {
  if (fallo) {
    return { tipo: "error", mensaje: procesados > 0 ? `Se procesaron ${procesados}, pero el resto falló: ${fallo}` : fallo };
  }
  if (procesados === 0) return { tipo: "error", mensaje: "Ninguna de las solicitudes es válida" };
  const noProcesadas = total - procesados;
  if (noProcesadas > 0) {
    return {
      tipo: "advertencia",
      mensaje: `${procesados} ${accion}. ${noProcesadas} no se ${noProcesadas === 1 ? "pudo" : "pudieron"} procesar porque cambiaron de estado — recarga la pantalla para verlas.`,
    };
  }
  return { tipo: "exito", mensaje: `${procesados} ${procesados === 1 ? "solicitud" : "solicitudes"} ${accion}` };
}
