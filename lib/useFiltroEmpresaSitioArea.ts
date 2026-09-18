// lib/useFiltroEmpresaSitioArea.ts
// Filtro en cascada Empresa -> Sitio -> Área, usado igual en las 4
// pantallas de TH que filtran una lista por ubicación (Colaboradores,
// Rutas, Asignar equipo, Asignar rutas): elegir una empresa reduce los
// sitios disponibles, elegir un sitio reduce las áreas, y cambiar
// cualquiera de arriba limpia los de abajo. Antes era el mismo bloque de
// estado + memos + handlers copiado en cada pantalla.

import { useMemo, useState } from "react";

type Opcion = { id: string; label: string };
type SitioConEmpresa = { id: string; nombre: string; empresaId: string };
type AreaConSitio = { id: string; nombre: string; sitioId: string };

export function useFiltroEmpresaSitioArea<S extends SitioConEmpresa, A extends AreaConSitio>(
  sitios: S[],
  areas: A[],
  // Se llama después de cualquier cambio de filtro — típicamente para
  // volver a la página 1 de la lista filtrada.
  alCambiar?: () => void
) {
  const [empresaFiltro, setEmpresaFiltro] = useState("");
  const [sitioFiltro, setSitioFiltro] = useState("");
  const [areaFiltro, setAreaFiltro] = useState("");

  const sitiosFiltro: Opcion[] = useMemo(
    () =>
      sitios
        .filter((s) => !empresaFiltro || s.empresaId === empresaFiltro)
        .map((s) => ({ id: s.id, label: s.nombre })),
    [sitios, empresaFiltro]
  );
  const areasFiltro: Opcion[] = useMemo(() => {
    const idsSitiosFiltro = new Set(sitiosFiltro.map((s) => s.id));
    return areas
      .filter((a) => (sitioFiltro ? a.sitioId === sitioFiltro : !empresaFiltro || idsSitiosFiltro.has(a.sitioId)))
      .map((a) => ({ id: a.id, label: a.nombre }));
  }, [areas, sitioFiltro, empresaFiltro, sitiosFiltro]);

  const cambiarEmpresaFiltro = (v: string) => {
    setEmpresaFiltro(v);
    setSitioFiltro("");
    setAreaFiltro("");
    alCambiar?.();
  };
  const cambiarSitioFiltro = (v: string) => {
    setSitioFiltro(v);
    setAreaFiltro("");
    alCambiar?.();
  };
  const cambiarAreaFiltro = (v: string) => {
    setAreaFiltro(v);
    alCambiar?.();
  };

  const cantidadFiltrosActivos = [empresaFiltro, sitioFiltro, areaFiltro].filter(Boolean).length;

  return {
    empresaFiltro,
    sitioFiltro,
    areaFiltro,
    sitiosFiltro,
    areasFiltro,
    cambiarEmpresaFiltro,
    cambiarSitioFiltro,
    cambiarAreaFiltro,
    cantidadFiltrosActivos,
  };
}
