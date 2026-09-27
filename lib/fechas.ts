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

// Fecha-sin-hora "YYYY-MM-DD" -> Date a medianoche UTC (como se guarda
// `fecha` en la base), o null si no es exactamente ese formato o no existe
// (ej. "2026-02-31"). Antes aceptaba cualquier cosa que entendiera `Date`
// (horas, zonas, "9/26/2026"...), lo que podía guardar el día equivocado o
// dejar fuera filas del último día de un rango.
export function fechaValida(valor: unknown): Date | null {
  if (typeof valor !== "string") return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor);
  if (!m) return null;
  const [anio, mes, dia] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const d = new Date(Date.UTC(anio, mes - 1, dia));
  return d.getUTCFullYear() === anio && d.getUTCMonth() === mes - 1 && d.getUTCDate() === dia ? d : null;
}

// "Hoy" en Ecuador (UTC-5, sin horario de verano) como fecha-sin-hora a
// medianoche UTC, para comparar contra `fecha`.
export function hoyEcuador(): Date {
  const ahora = new Date(Date.now() - 5 * 60 * 60 * 1000);
  return new Date(Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth(), ahora.getUTCDate()));
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

// DD/MM/YYYY del día en hora de Ecuador, para columnas con HORA real
// (ej. fechaPago). formatearFecha usa UTC y es solo para fechas-sin-hora:
// con un pago hecho de noche mostraría el día siguiente.
export function formatearFechaEcuador(fecha: string | Date): string {
  const d = typeof fecha === "string" ? new Date(fecha) : fecha;
  return d.toLocaleDateString("es-EC", { timeZone: "America/Guayaquil", day: "2-digit", month: "2-digit", year: "numeric" });
}
