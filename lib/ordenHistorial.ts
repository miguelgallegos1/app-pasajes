// lib/ordenHistorial.ts
// Orden de los historiales paginados en el SERVIDOR: los historiales
// traen de a una página (15 filas), así que ordenar en el navegador solo
// reordenaba esa página. Con esto, al hacer clic en una columna se ordena
// TODO el rango y recién después se pagina.
//
// Query params: `orden` (campo) y `dir` ("asc" | "desc"). Solo se aceptan
// los campos listados acá — cualquier otro valor se ignora y se usa el
// orden por defecto de cada pantalla.

import type { Prisma } from "../app/generated/prisma/client";

type Direccion = "asc" | "desc";

function leerDireccion(valor: string | null): Direccion {
  return valor === "asc" ? "asc" : "desc";
}

// Columnas ordenables de las tablas de solicitudes (mismos nombres que
// usan las pantallas en EncabezadoOrdenable).
const ORDEN_SOLICITUD: Record<string, (d: Direccion) => Prisma.SolicitudPasajeOrderByWithRelationInput> = {
  fecha: (d) => ({ fecha: d }),
  nombreColaborador: (d) => ({ colaborador: { nombreCompleto: d } }),
  rutaLabel: (d) => ({ ruta: { nombre: d } }),
  montoTotal: (d) => ({ montoTotal: d }),
  estado: (d) => ({ estado: d }),
};

export function ordenSolicitudes(
  searchParams: URLSearchParams,
  porDefecto: Prisma.SolicitudPasajeOrderByWithRelationInput
): Prisma.SolicitudPasajeOrderByWithRelationInput[] {
  const campo = searchParams.get("orden");
  const elegido = campo && ORDEN_SOLICITUD[campo] ? ORDEN_SOLICITUD[campo](leerDireccion(searchParams.get("dir"))) : porDefecto;
  // Desempate por id: con muchas filas del mismo valor (ej. mismo monto),
  // sin esto una fila podría repetirse o saltarse entre una página y otra.
  return [elegido, { id: "asc" }];
}

// Vista "Por colaborador": la lista agregada ya viene completa del
// groupBy (una fila por colaborador), se ordena entera antes de paginarla.
type FilaAgregada = { nombreColaborador: string; total: number };

export function ordenarColaboradores<T extends FilaAgregada>(filas: T[], searchParams: URLSearchParams): T[] {
  const campo = searchParams.get("orden");
  if (campo !== "nombre" && campo !== "total") return filas; // por defecto: alfabético (ya viene así)
  const signo = leerDireccion(searchParams.get("dir")) === "asc" ? 1 : -1;
  return [...filas].sort((a, b) =>
    campo === "total" ? (a.total - b.total) * signo : a.nombreColaborador.localeCompare(b.nombreColaborador) * signo
  );
}
