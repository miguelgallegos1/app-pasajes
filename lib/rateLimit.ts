// lib/rateLimit.ts
// Limitador de intentos en memoria, pensado para frenar fuerza bruta
// contra el login por PIN (6 dígitos = solo 1.000.000 de combinaciones).
// Asume un solo proceso Node sirviendo la app (como "next start" en un
// único servidor); si algún día se escala a varias instancias detrás de
// un balanceador, esto debería moverse a un almacén compartido (Redis).

type Entrada = { conteo: number; venceEn: number };

const intentos = new Map<string, Entrada>();

const VENTANA_MS = 5 * 60 * 1000; // 5 minutos
const MAX_INTENTOS = 8;

// Evita que el Map crezca sin límite: cada vez que se agrega una clave
// nueva, aprovechamos para descartar las que ya vencieron.
function limpiarVencidas(ahora: number) {
  for (const [clave, entrada] of intentos) {
    if (entrada.venceEn < ahora) intentos.delete(clave);
  }
}

// Devuelve false si `clave` (normalmente la IP del cliente) ya superó
// MAX_INTENTOS dentro de la ventana de tiempo actual.
export function intentoPermitido(clave: string): boolean {
  const ahora = Date.now();
  const entrada = intentos.get(clave);

  if (!entrada || entrada.venceEn < ahora) {
    intentos.set(clave, { conteo: 1, venceEn: ahora + VENTANA_MS });
    if (intentos.size > 1000) limpiarVencidas(ahora);
    return true;
  }

  if (entrada.conteo >= MAX_INTENTOS) return false;
  entrada.conteo++;
  return true;
}

export function obtenerIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return "desconocida";
}
