// components/PanelCargaMasiva.tsx
// Carga masiva por Excel de Colaboradores y Rutas (solo Super Admin):
// descargar plantilla -> completarla -> subirla -> ver fila por fila qué
// se creó y qué falló (y por qué), sin que un error tumbe al resto.

"use client";

import { useRef, useState } from "react";
import Spinner from "./Spinner";
import { IconoDescargar } from "./Icons";
import { useToast } from "./Toast";

type FilaResultado = {
  fila: number;
  estado: "OK" | "ERROR";
  mensaje: string;
  pin?: string;
  nombreCompleto?: string;
  codigoNomina?: string;
};
type Resultado = { creadas: number; total: number; resultados: FilaResultado[] };

function celdaCSV(valor: string): string {
  return `"${valor.replace(/"/g, '""')}"`;
}

function descargarResultadosCSV(resultado: Resultado, nombreArchivo: string, columnaPin?: boolean) {
  const encabezados = columnaPin
    ? ["Fila", "Estado", "Colaborador", "Código", "PIN", "Detalle"]
    : ["Fila", "Estado", "Detalle"];
  const filas = resultado.resultados.map((r) =>
    columnaPin
      ? [String(r.fila), r.estado, r.nombreCompleto ?? "", r.codigoNomina ?? "", r.pin ?? "", r.mensaje]
      : [String(r.fila), r.estado, r.mensaje]
  );
  const contenido = [encabezados, ...filas].map((fila) => fila.map(celdaCSV).join(",")).join("\r\n");
  // BOM al inicio para que Excel detecte UTF-8 y no rompa las tildes/eñes.
  const blob = new Blob(["﻿" + contenido], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombreArchivo;
  enlace.click();
  URL.revokeObjectURL(url);
}

function BloqueCarga({
  titulo,
  descripcion,
  urlPlantilla,
  urlSubida,
  columnaPin,
}: {
  titulo: string;
  descripcion: string;
  urlPlantilla: string;
  urlSubida: string;
  columnaPin?: boolean;
}) {
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [error, setError] = useState("");

  const elegirArchivo = (e: React.ChangeEvent<HTMLInputElement>) => {
    setArchivo(e.target.files?.[0] ?? null);
    setResultado(null);
    setError("");
  };

  const subir = async () => {
    if (!archivo) return;
    setSubiendo(true);
    setError("");
    setResultado(null);
    try {
      const formData = new FormData();
      formData.append("archivo", archivo);
      const res = await fetch(urlSubida, { method: "POST", body: formData });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "No se pudo procesar el archivo");
        toast.error(data.error ?? "No se pudo procesar el archivo");
        return;
      }
      setResultado(data);
      toast.exito(`${data.creadas} de ${data.total} fila(s) creada(s) correctamente`);
      setArchivo(null);
      if (inputRef.current) inputRef.current.value = "";
    } catch {
      setError("No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.");
      toast.error("No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setSubiendo(false);
    }
  };

  return (
    <div className="bg-neutral-50 dark:bg-neutral-900 rounded-2xl p-5 shadow-sm ring-1 ring-black/5 dark:ring-white/10 space-y-4 transition hover:shadow-md hover:-translate-y-0.5">
      <div>
        <h2 className="text-base font-bold text-neutral-900 dark:text-white">{titulo}</h2>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">{descripcion}</p>
      </div>

      <a
        href={urlPlantilla}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-700 dark:text-neutral-300 border border-neutral-300 hover:border-orange-400 hover:text-orange-600 px-3.5 py-2.5 rounded-xl transition"
      >
        <IconoDescargar className="w-4 h-4" /> Descargar plantilla
      </a>

      <div className="flex flex-col sm:flex-row gap-2">
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx"
          onChange={elegirArchivo}
          className="flex-1 text-sm text-neutral-600 dark:text-neutral-300 file:mr-3 file:py-2 file:px-3.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-neutral-200 dark:file:bg-neutral-700 file:text-neutral-700 dark:file:text-neutral-200 hover:file:bg-neutral-300 dark:hover:file:bg-neutral-600"
        />
        <button
          onClick={subir}
          disabled={!archivo || subiendo}
          className="shrink-0 px-5 py-2.5 text-sm font-semibold bg-orange-500 hover:bg-orange-600 text-white rounded-xl disabled:opacity-50 transition flex items-center justify-center gap-2"
        >
          {subiendo && <Spinner className="w-4 h-4" />}
          {subiendo ? "Procesando..." : "Subir archivo"}
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {resultado && (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              {resultado.creadas} de {resultado.total} fila(s) creada(s) correctamente
              {resultado.creadas < resultado.total && (
                <span className="text-red-600"> · {resultado.total - resultado.creadas} con errores</span>
              )}
            </p>
            <button
              type="button"
              onClick={() => descargarResultadosCSV(resultado, `resultado-carga-${titulo.toLowerCase()}.csv`, columnaPin)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-700 dark:text-neutral-300 border border-neutral-300 hover:border-orange-400 hover:text-orange-600 px-3 py-2 rounded-lg transition"
            >
              <IconoDescargar className="w-3.5 h-3.5" /> Descargar resultado
            </button>
          </div>
          {columnaPin && resultado.creadas > 0 && (
            <p className="text-xs text-amber-600 font-medium">
              Descargá el resultado o copiá los PIN generados antes de salir de esta pantalla — no se pueden volver a ver después.
            </p>
          )}
          <div className="bg-white dark:bg-neutral-900 rounded-xl ring-1 ring-black/5 dark:ring-white/10 overflow-hidden">
            <div className="max-h-80 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 text-left sticky top-0 z-10">
                  <tr>
                    <th className="px-3 py-2 font-medium w-14">Fila</th>
                    <th className="px-3 py-2 font-medium w-20">Estado</th>
                    {columnaPin && <th className="px-3 py-2 font-medium">Colaborador</th>}
                    {columnaPin && <th className="px-3 py-2 font-medium">Código</th>}
                    {columnaPin && <th className="px-3 py-2 font-medium w-20">PIN</th>}
                    <th className="px-3 py-2 font-medium">Detalle</th>
                  </tr>
                </thead>
                <tbody>
                  {resultado.resultados.map((r) => (
                    <tr key={r.fila} className="border-t border-neutral-100 dark:border-neutral-800">
                      <td className="px-3 py-2 text-neutral-400 dark:text-neutral-500">{r.fila}</td>
                      <td className="px-3 py-2">
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            r.estado === "OK" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-700"
                          }`}
                        >
                          {r.estado}
                        </span>
                      </td>
                      {columnaPin && <td className="px-3 py-2 text-neutral-700 dark:text-neutral-300">{r.nombreCompleto ?? "—"}</td>}
                      {columnaPin && <td className="px-3 py-2 text-neutral-500 dark:text-neutral-400">{r.codigoNomina ?? "—"}</td>}
                      {columnaPin && (
                        <td className="px-3 py-2 font-mono font-bold tracking-widest text-neutral-700 dark:text-neutral-300">{r.pin ?? "—"}</td>
                      )}
                      <td className="px-3 py-2 text-neutral-600 dark:text-neutral-300">{r.mensaje}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PanelCargaMasiva() {
  return (
    <div className="flex-1 px-4 sm:px-8 py-5 space-y-4">
      <div className="flex flex-wrap items-baseline gap-2">
        <h1 className="text-lg sm:text-xl font-bold">Carga masiva</h1>
        <span className="hidden sm:inline text-xs text-neutral-500 dark:text-neutral-400">
          · Cargá muchos colaboradores o rutas de una sola vez desde un Excel
        </span>
      </div>

      <BloqueCarga
        titulo="Colaboradores"
        descripcion="Crea colaboradores nuevos (con su cuenta de acceso y PIN) a partir de un Excel."
        urlPlantilla="/api/admin/carga-masiva/colaboradores/plantilla"
        urlSubida="/api/admin/carga-masiva/colaboradores"
        columnaPin
      />

      <BloqueCarga
        titulo="Rutas"
        descripcion="Crea rutas nuevas dentro de las Áreas que ya existen, a partir de un Excel."
        urlPlantilla="/api/admin/carga-masiva/rutas/plantilla"
        urlSubida="/api/admin/carga-masiva/rutas"
      />
    </div>
  );
}
