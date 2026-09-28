// lib/nombreArchivo.ts
// Nombre de los archivos que se descargan (Excel del servidor, CSV armado
// en el navegador). Aparte de lib/exportarExcel.ts para que el navegador
// pueda usarlo sin cargar la librería de Excel.

// Cada palabra con la primera letra en mayúscula ("historial-revision" →
// "Historial-Revision") y un sufijo numérico corto al final, para que el
// navegador no le agregue "(1)", "(2)"... al descargar varias veces el
// mismo archivo. El sufijo son los últimos 6 dígitos de los milisegundos
// actuales: se repite recién cada ~16 minutos y solo chocaría si además
// coincide al milisegundo.
export function nombreArchivoDescarga(base: string, extension: string): string {
  const conMayusculas = base.replace(/(^|-)([a-záéíóúñ])/g, (_, sep: string, letra: string) => sep + letra.toUpperCase());
  const sufijo = String(Date.now() % 1_000_000).padStart(6, "0");
  return `${conMayusculas}-${sufijo}.${extension}`;
}
