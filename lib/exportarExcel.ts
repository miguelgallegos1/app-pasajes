// lib/exportarExcel.ts
// Arma un archivo .xlsx en el servidor a partir de filas planas. Se usa
// SOLO en rutas de API (nunca se importa desde un componente de
// cliente), para que la librería xlsx no viaje al navegador.

import * as XLSX from "xlsx";

export function construirLibroExcel(filas: Record<string, unknown>[], nombreHoja: string): Buffer {
  return construirLibroExcelMultiHoja([{ nombre: nombreHoja, filas }]);
}

// Variante con varias hojas: se usa en las plantillas de carga masiva, para
// incluir además una hoja de referencia con los nombres exactos de
// Empresa/Sitio/Área ya existentes (evita errores de tipeo al importar).
export function construirLibroExcelMultiHoja(hojas: { nombre: string; filas: Record<string, unknown>[] }[]): Buffer {
  const libro = XLSX.utils.book_new();
  for (const { nombre, filas } of hojas) {
    const hoja = XLSX.utils.json_to_sheet(filas);
    XLSX.utils.book_append_sheet(libro, hoja, nombre.slice(0, 31)); // Excel limita el nombre de hoja a 31 caracteres
  }
  return XLSX.write(libro, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

const TOPE_FILAS_EXPORTACION = 5000;

export function limitarFilasExportacion<T>(filas: T[]): { filas: T[]; truncado: boolean } {
  if (filas.length <= TOPE_FILAS_EXPORTACION) return { filas, truncado: false };
  return { filas: filas.slice(0, TOPE_FILAS_EXPORTACION), truncado: true };
}
