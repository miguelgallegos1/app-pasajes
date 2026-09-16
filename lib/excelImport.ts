// lib/excelImport.ts
// Lee un archivo .xlsx subido por el usuario y lo convierte en filas planas
// (una por fila de la primera hoja, con las cabeceras como claves).
// Server-only — nunca se importa desde un componente de cliente.

import * as XLSX from "xlsx";

export function leerLibroExcel(buffer: Buffer): Record<string, unknown>[] {
  const libro = XLSX.read(buffer, { type: "buffer" });
  const primeraHoja = libro.SheetNames[0];
  if (!primeraHoja) return [];
  const hoja = libro.Sheets[primeraHoja];
  return XLSX.utils.sheet_to_json(hoja, { defval: "" });
}

export const TOPE_FILAS_IMPORTACION = 500;

export function texto(valor: unknown): string {
  return String(valor ?? "").trim();
}

export function valorBooleanoSiNo(valor: unknown): boolean {
  const v = texto(valor).toUpperCase();
  return ["SI", "SÍ", "YES", "1", "TRUE", "X"].includes(v);
}
