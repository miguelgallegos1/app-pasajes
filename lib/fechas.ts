// lib/fechas.ts
// Formatea una fecha como DD/MM/YYYY usando los componentes UTC,
// para evitar el "corrimiento de un día" que ocurre al mostrar
// fechas-sin-hora en zonas horarias negativas (como Ecuador, UTC-5).
export function formatearFecha(fecha: string | Date): string {
  const d = typeof fecha === "string" ? new Date(fecha) : fecha;
  const dia = String(d.getUTCDate()).padStart(2, "0");
  const mes = String(d.getUTCMonth() + 1).padStart(2, "0");
  const anio = d.getUTCFullYear();
  return `${dia}/${mes}/${anio}`;
}

// Devuelve el Date parseado, o null si `valor` no es una fecha válida —
// para no pasarle un Invalid Date a Prisma (lanzaría una excepción no
// controlada en vez de un 400 claro) en filtros de rango por query param.
export function fechaValida(valor: string): Date | null {
  const d = new Date(valor);
  return Number.isNaN(d.getTime()) ? null : d;
}