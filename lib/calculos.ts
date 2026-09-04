// lib/calculos.ts
// Calcula el monto total de una solicitud de pasajes.
// SIEMPRE se calcula aquí, en el backend — nunca se confía en un monto
// que venga desde el navegador, para evitar que alguien lo manipule.

export const FACTOR_FRECUENCIA: Record<string, number> = {
  DIARIA: 2, // ida y vuelta, 1 día
  SEMANAL: 10, // 5 días hábiles x 2 (ida y vuelta)
  MENSUAL: 44, // ~22 días hábiles x 2
  ANUAL: 528, // 12 meses x 44
};

export function calcularMonto(
  montoBaseRuta: number,
  frecuencia: string,
  cantidadPasajes: number
) {
  const factor = FACTOR_FRECUENCIA[frecuencia] ?? 1;
  return Number((montoBaseRuta * factor * cantidadPasajes).toFixed(2));
}