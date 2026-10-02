// lib/useHistorialVistas.ts
// Lógica común de los historiales con buscador y dos vistas (Lista / Por
// colaborador) — TH, Coordinación, Nómina y Jefe: consulta paginada y
// ordenada en el servidor de cada vista, detalle de un colaborador al
// expandirlo, URL del Excel y re-búsqueda al cambiar orden o vista. Antes
// cada pantalla repetía este bloque entero; ahora solo arma sus columnas.
// Todo usa SIEMPRE la foto de la última búsqueda (`aplicados`), no lo que
// se está cambiando en pantalla.

"use client";

import { useEffect, useState } from "react";
import { useHistorialLista } from "./useHistorialLista";
import { useOrdenServidor, agregarOrdenAParams } from "./useOrdenTabla";
import { useReportarCarga } from "./cargaGlobal";
import type { FilaColaborador, CampoOrdenColaborador } from "../components/TablaColaboradores";

export type VistaHistorial = "lista" | "colaborador";

export function useHistorialVistas<Fila, CampoOrden extends string>({
  aplicados,
  api,
  claveOrden,
  claveOrdenColaborador,
}: {
  // Filtros de la última búsqueda (de useBuscadorHistorial), o null si aún no se buscó.
  aplicados: string | null;
  // Base de la API, ej. "/api/th/historial" (+ /colaboradores y /exportar).
  api: string;
  // Claves para recordar el orden de cada vista entre visitas.
  claveOrden: string;
  claveOrdenColaborador: string;
}) {
  const [vista, setVista] = useState<VistaHistorial>("lista");
  const parametros = () => new URLSearchParams(aplicados ?? "");

  const { orden, ordenar: ordenarBase } = useOrdenServidor<CampoOrden>(claveOrden);
  const lista = useHistorialLista<Fila>((pagina) => {
    if (!aplicados) return null;
    const params = parametros();
    params.set("pagina", String(pagina));
    agregarOrdenAParams(params, orden);
    return `${api}?${params.toString()}`;
  });

  // --- Vista "Por colaborador": una fila por colaborador, paginada y
  // ordenada en el servidor; el detalle se pide solo al expandir.
  const { orden: ordenColab, ordenar: ordenarColabBase } = useOrdenServidor<CampoOrdenColaborador>(claveOrdenColaborador);
  const [filasColab, setFilasColab] = useState<FilaColaborador[] | null>(null);
  const [paginaColab, setPaginaColab] = useState(1);
  const [totalPaginasColab, setTotalPaginasColab] = useState(1);
  const [cargandoColab, setCargandoColab] = useState(false);
  const [errorColab, setErrorColab] = useState("");
  useReportarCarga(cargandoColab);

  const buscarColab = async (paginaNueva = 1) => {
    if (!aplicados) return;
    setCargandoColab(true);
    setErrorColab("");
    const params = parametros();
    params.set("pagina", String(paginaNueva));
    agregarOrdenAParams(params, ordenColab);
    try {
      const res = await fetch(`${api}/colaboradores?${params.toString()}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorColab(data.error ?? "No se pudo cargar el historial");
        return;
      }
      setFilasColab(data.items);
      setTotalPaginasColab(data.totalPaginas);
      setPaginaColab(paginaNueva);
    } catch {
      setErrorColab("No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setCargandoColab(false);
    }
  };

  // Detalle de UN colaborador (con los mismos filtros), solo al expandirlo.
  const cargarItemsColaborador = async (idColaborador: string): Promise<Fila[]> => {
    const params = parametros();
    params.set("colaboradorId", idColaborador);
    params.set("pagina", "1");
    const res = await fetch(`${api}?${params.toString()}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.items;
  };

  // buscar() arma la URL con el estado de ESTE render: tras aplicar los
  // filtros (o cambiar orden/vista), la consulta sale en el render siguiente.
  const [pedidoBusqueda, setPedidoBusqueda] = useState(0);
  useEffect(() => {
    if (!pedidoBusqueda) return;
    if (vista === "lista") lista.buscar(1);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- dispara una consulta de red
    else buscarColab(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pedidoBusqueda]);
  const rebuscar = () => setPedidoBusqueda((n) => n + 1);

  // El orden lo aplica el servidor a TODO el rango: al cambiarlo se vuelve
  // a pedir la página 1 (ordenar en memoria solo reordenaba la página visible).
  const ordenar = (campo: CampoOrden) => {
    ordenarBase(campo);
    if (aplicados) rebuscar();
  };
  const ordenarColab = (campo: CampoOrdenColaborador) => {
    ordenarColabBase(campo);
    if (aplicados) rebuscar();
  };

  const cambiarVista = (v: VistaHistorial) => {
    setVista(v);
    setFilasColab(null);
    if (aplicados) rebuscar();
  };

  // Excel con los filtros de la última búsqueda (sin paginar); solo se
  // habilita si esa búsqueda trajo resultados — evita un Excel vacío.
  const urlExportar = () => {
    const params = parametros();
    agregarOrdenAParams(params, orden);
    return `${api}/exportar?${params.toString()}`;
  };
  const ocupado = lista.cargando || cargandoColab;
  const hayDatos = vista === "lista" ? (lista.items?.length ?? 0) > 0 : (filasColab?.length ?? 0) > 0;
  const puedeExportar = !ocupado && !!aplicados && hayDatos;

  return {
    vista,
    cambiarVista,
    rebuscar,
    ocupado,
    hayDatos,
    puedeExportar,
    urlExportar,
    error: vista === "lista" ? lista.error : errorColab,
    lista: { ...lista, orden, ordenar },
    colaborador: {
      filas: filasColab,
      pagina: paginaColab,
      totalPaginas: totalPaginasColab,
      cargando: cargandoColab,
      buscar: buscarColab,
      orden: ordenColab,
      ordenar: ordenarColab,
      cargarItems: cargarItemsColaborador,
    },
  };
}
