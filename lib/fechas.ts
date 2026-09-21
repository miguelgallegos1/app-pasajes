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

// "YYYY-MM-DD" en hora LOCAL (no UTC) — el mismo formato que usan los
// selectores de fecha como value. Solo se debe usar dentro de un
// useEffect (nunca como valor inicial de useState ni en el cuerpo del
// render): si el servidor calculara "hoy" al armar el HTML y el navegador
// calcula otro día distinto al hidratar (reloj/zona horaria distintos),
// React tira un error de hidratación.
export function fechaATexto(fecha: Date): string {
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, "0");
  const d = String(fecha.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function fechaHoyTexto(): string {
  return fechaATexto(new Date());
}

// Igual que fechaATexto ("YYYY-MM-DD", orden lexicográfico = orden
// cronológico) pero con componentes UTC en vez de locales — para comparar
// una fecha-sin-hora que viene del servidor (ISO a medianoche UTC, ver
// formatearFecha) contra un rango elegido en un RangoFechasSelector/
// CalendarioSelector (que sí usa fechaATexto, en hora LOCAL) sin el
// corrimiento de un día que da mezclar ambas zonas horarias.
export function fechaUTCATexto(fecha: string | Date): string {
  const d = typeof fecha === "string" ? new Date(fecha) : fecha;
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dia = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${dia}`;
}