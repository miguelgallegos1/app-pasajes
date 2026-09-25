// lib/exportarExcel.ts
// Arma un archivo .xlsx en el servidor a partir de filas planas. Se usa
// SOLO en rutas de API (nunca se importa desde un componente de
// cliente), para que la librería xlsx no viaje al navegador.

import * as XLSX from "xlsx";
import { formatearFecha } from "./fechas";

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

// Estructura común de los Excel de historial de Coordinación y Nómina: las
// columnas y su orden los pidió el área usuaria, no reordenar.
type SolicitudParaHistorial = {
  estado: string;
  fecha: Date;
  montoTotal: unknown;
  aprobadoPorId: string | null;
  revisadoPorId: string | null;
  pagadoPorId: string | null;
  colaborador: { nombreCompleto: string; codigoNomina: string | null };
  ruta: { nombre: string; area: { nombre: string; sitio: { nombre: string; empresa: { nombre: string } } } };
};

// nombrePorActorId: ver nombresDeUsuarios en lib/nombresActores.ts.
export function filaHistorialExcel(s: SolicitudParaHistorial, nombrePorActorId: Map<string, string>) {
  const nombre = (id: string | null) => (id ? (nombrePorActorId.get(id) ?? "") : "");
  return {
    Empresa: s.ruta.area.sitio.empresa.nombre,
    Sitio: s.ruta.area.sitio.nombre,
    Área: s.ruta.area.nombre,
    "Código colaborador": s.colaborador.codigoNomina ?? "",
    Colaborador: s.colaborador.nombreCompleto,
    Ruta: s.ruta.nombre,
    Estado: s.estado,
    Fecha: formatearFecha(s.fecha),
    Valor: Number(s.montoTotal),
    "Aprobado por": nombre(s.aprobadoPorId),
    "Revisado por": nombre(s.revisadoPorId),
    "Pagado por": nombre(s.pagadoPorId),
  };
}

// Fila final que avisa, dentro del propio Excel, que se aplicó el tope de
// filas (el archivo se descarga con un link directo, sin aviso en pantalla).
export function filaAvisoTruncadoHistorial(): ReturnType<typeof filaHistorialExcel> {
  return {
    Empresa: "Exportación limitada a 5000 filas. Acorta el rango de fechas para ver el resto.",
    Sitio: "",
    Área: "",
    "Código colaborador": "",
    Colaborador: "",
    Ruta: "",
    Estado: "",
    Fecha: "",
    Valor: 0,
    "Aprobado por": "",
    "Revisado por": "",
    "Pagado por": "",
  };
}

// Nombre del archivo descargado: cada palabra con la primera letra en
// mayúscula ("historial-revision" → "Historial-Revision") y un sufijo
// numérico corto al final, para que el navegador no le agregue "(1)",
// "(2)"... al descargar varias veces el mismo reporte. El sufijo son los
// últimos 6 dígitos de los milisegundos actuales: se repite recién cada
// ~16 minutos y solo chocaría si además coincide al milisegundo.
export function nombreArchivoExcel(base: string): string {
  const conMayusculas = base.replace(/(^|-)([a-záéíóúñ])/g, (_, sep: string, letra: string) => sep + letra.toUpperCase());
  const sufijo = String(Date.now() % 1_000_000).padStart(6, "0");
  return `${conMayusculas}-${sufijo}.xlsx`;
}
