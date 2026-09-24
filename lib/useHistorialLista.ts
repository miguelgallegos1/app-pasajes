// lib/useHistorialLista.ts
// Estado + fetch paginado de una pantalla de historial "de una sola
// vista" (items/total/monto/página, cargando, error): el mismo bloque
// que antes se repetía en cada Panel*Historial* que no tiene vista
// alterna "por colaborador" (los que sí la tienen — Nómina, Jefe,
// Coordinador — comparten cargando/error entre dos fetches distintos
// según la vista, así que no encajan en este hook genérico).

import { useState } from "react";

type RespuestaHistorial<T> = {
  items: T[];
  totalMonto?: number;
  total?: number;
  totalPaginas?: number;
  error?: string;
};

export function useHistorialLista<T>(
  // Devuelve la URL a pedir para esa página, o null si todavía faltan
  // datos requeridos (ej. el rango de fechas) — en ese caso se corta con
  // el mensaje de error sin llegar a hacer fetch.
  construirUrl: (pagina: number) => string | null
) {
  const [items, setItems] = useState<T[] | null>(null);
  const [totalMonto, setTotalMonto] = useState(0);
  const [totalRegistros, setTotalRegistros] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  // URL y respuesta de la última búsqueda que salió bien: para acciones
  // que dependen de lo que SE BUSCÓ (ej. imprimir con esos mismos
  // filtros), no de lo que se está eligiendo todavía en pantalla.
  const [ultimaUrl, setUltimaUrl] = useState<string | null>(null);
  const [ultimaRespuesta, setUltimaRespuesta] = useState<Record<string, unknown> | null>(null);

  const buscar = async (paginaNueva = 1) => {
    const url = construirUrl(paginaNueva);
    if (!url) {
      setError("Selecciona ambas fechas");
      return;
    }
    setCargando(true);
    setError("");
    try {
      const res = await fetch(url);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "No se pudo cargar el historial");
        return;
      }
      const data: RespuestaHistorial<T> = await res.json();
      setItems(data.items);
      setTotalMonto(data.totalMonto ?? 0);
      setTotalRegistros(data.total ?? 0);
      setTotalPaginas(data.totalPaginas ?? 1);
      setPagina(paginaNueva);
      setUltimaUrl(url);
      setUltimaRespuesta(data as unknown as Record<string, unknown>);
    } catch {
      setError("No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setCargando(false);
    }
  };

  return { items, totalMonto, totalRegistros, pagina, totalPaginas, cargando, error, buscar, ultimaUrl, ultimaRespuesta };
}
