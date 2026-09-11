// lib/exportarExcel.ts
// Arma un archivo .xlsx en el servidor a partir de filas planas. Se usa
// SOLO en rutas de API (nunca se importa desde un componente de
// cliente), para que la librería xlsx no viaje al navegador.

import * as XLSX from "xlsx";

export function construirLibroExcel(filas: Record<string, unknown>[], nombreHoja: string): Buffer {
  const hoja = XLSX.utils.json_to_sheet(filas);
  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hoja, nombreHoja.slice(0, 31)); // Excel limita el nombre de hoja a 31 caracteres
  return XLSX.write(libro, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

const TOPE_FILAS_EXPORTACION = 5000;

export function limitarFilasExportacion<T>(filas: T[]): { filas: T[]; truncado: boolean } {
  if (filas.length <= TOPE_FILAS_EXPORTACION) return { filas, truncado: false };
  return { filas: filas.slice(0, TOPE_FILAS_EXPORTACION), truncado: true };
}
