// lib/useBuscadorHistorial.ts
// Estado del buscador de los historiales (TH, Coordinación, Nómina):
// primero se elige TODO (fechas + Empresa/Sitio/Área + personas + extras de
// cada pantalla) y recién al pulsar "Buscar" se consulta — nada se trae
// solo al entrar ni al cambiar un filtro.
// - Empresa/Sitio/Área salen del alcance asignado del usuario
//   (/api/historial/alcance), no de los datos. Si en un nivel hay una sola
//   opción, queda elegida sola (calculado, sin efectos).
// - Supervisor/Colaborador se cargan según el alcance elegido
//   (/api/historial/personas), sin depender de la fecha.
// - "aplicados" es la foto de los filtros de la última búsqueda: la
//   paginación, el orden, el Excel y la constancia usan SIEMPRE esa foto,
//   no lo que se está cambiando en pantalla.

"use client";

import { useEffect, useMemo, useState } from "react";
import { fechaHoyTexto } from "./fechas";

export type OpcionBuscador = { id: string; label: string };
type Estructura = {
  empresas: { id: string; nombre: string }[];
  sitios: { id: string; nombre: string; empresaId: string }[];
  areas: { id: string; nombre: string; sitioId: string }[];
  sinAsignaciones: boolean;
};
type Personas = {
  clave: string;
  colaboradores: { id: string; nombre: string; supervisorId: string | null }[];
  supervisores: { id: string; nombre: string }[];
  haySinSupervisor: boolean;
};

// Debe coincidir con el sentinel de las APIs de historial (no es un id real).
export const SIN_SUPERVISOR = "__sin_supervisor__";

export function useBuscadorHistorial({ conSupervisor }: { conSupervisor: boolean }) {
  const [desde, setDesde] = useState(fechaHoyTexto);
  const [hasta, setHasta] = useState(fechaHoyTexto);
  const [empresaElegida, setEmpresaElegida] = useState("");
  const [sitioElegido, setSitioElegido] = useState("");
  const [areaId, setAreaId] = useState("");
  const [supervisorId, setSupervisorId] = useState("");
  const [colaboradorId, setColaboradorId] = useState("");
  const [aplicados, setAplicados] = useState<string | null>(null);

  const [estructura, setEstructura] = useState<Estructura | null>(null);
  const [errorEstructura, setErrorEstructura] = useState(false);
  useEffect(() => {
    let cancelado = false;
    fetch("/api/historial/alcance")
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data: Estructura) => !cancelado && setEstructura(data))
      .catch(() => !cancelado && setErrorEstructura(true));
    return () => {
      cancelado = true;
    };
  }, []);

  // --- Cascada con elección automática cuando hay una sola opción ---
  const empresas = useMemo(
    () => (estructura?.empresas ?? []).map((e) => ({ id: e.id, label: e.nombre })),
    [estructura]
  );
  const empresaId = empresaElegida || (empresas.length === 1 ? empresas[0].id : "");
  const sitios = useMemo(
    () => (estructura?.sitios ?? []).filter((s) => s.empresaId === empresaId).map((s) => ({ id: s.id, label: s.nombre })),
    [estructura, empresaId]
  );
  const sitioId = sitioElegido || (sitios.length === 1 ? sitios[0].id : "");
  const areas = useMemo(
    () => (estructura?.areas ?? []).filter((a) => a.sitioId === sitioId).map((a) => ({ id: a.id, label: a.nombre })),
    [estructura, sitioId]
  );

  const cambiarEmpresa = (v: string) => {
    setEmpresaElegida(v);
    setSitioElegido("");
    setAreaId("");
    setSupervisorId("");
    setColaboradorId("");
  };
  const cambiarSitio = (v: string) => {
    setSitioElegido(v);
    setAreaId("");
    setSupervisorId("");
    setColaboradorId("");
  };
  const cambiarArea = (v: string) => {
    setAreaId(v);
    setSupervisorId("");
    setColaboradorId("");
  };
  const cambiarSupervisor = (v: string) => {
    setSupervisorId(v);
    setColaboradorId("");
  };

  // --- Personas del alcance elegido (se piden cuando ya hay sitio) ---
  const clavePersonas = sitioId ? `${empresaId}|${sitioId}|${areaId}` : "";
  const [personas, setPersonas] = useState<Personas | null>(null);
  useEffect(() => {
    if (!clavePersonas) return;
    const params = new URLSearchParams({ empresaId, sitioId });
    if (areaId) params.set("areaId", areaId);
    let cancelado = false;
    fetch(`/api/historial/personas?${params.toString()}`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data: Omit<Personas, "clave">) => !cancelado && setPersonas({ ...data, clave: clavePersonas }))
      .catch(() => !cancelado && setPersonas({ clave: clavePersonas, colaboradores: [], supervisores: [], haySinSupervisor: false }));
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- clavePersonas ya resume empresa/sitio/área
  }, [clavePersonas]);
  const personasActuales = personas && personas.clave === clavePersonas ? personas : null;
  const cargandoPersonas = !!clavePersonas && !personasActuales;

  const supervisores: OpcionBuscador[] = useMemo(() => {
    if (!personasActuales) return [];
    const lista = personasActuales.supervisores.map((s) => ({ id: s.id, label: s.nombre }));
    if (personasActuales.haySinSupervisor) lista.push({ id: SIN_SUPERVISOR, label: "Sin supervisor (solicita directo)" });
    return lista;
  }, [personasActuales]);

  const colaboradores: OpcionBuscador[] = useMemo(() => {
    if (!personasActuales) return [];
    return personasActuales.colaboradores
      .filter((c) =>
        !conSupervisor || !supervisorId
          ? true
          : supervisorId === SIN_SUPERVISOR
          ? !c.supervisorId
          : c.supervisorId === supervisorId || c.id === supervisorId
      )
      .map((c) => ({ id: c.id, label: c.nombre }));
  }, [personasActuales, supervisorId, conSupervisor]);

  // --- Validación y foto de lo aplicado ---
  const faltante = !desde || !hasta ? "Elige el rango de fechas" : !empresaId ? "Elige la empresa" : !sitioId ? "Elige el sitio" : null;

  // `extras`: filtros propios de cada pantalla (ej. estado), para que
  // formen parte de la foto aplicada y de la detección de cambios.
  const armarParams = (extras: Record<string, string> = {}) => {
    const p = new URLSearchParams({ desde, hasta, empresaId, sitioId });
    if (areaId) p.set("areaId", areaId);
    if (conSupervisor && supervisorId) p.set("supervisorId", supervisorId);
    if (colaboradorId) p.set("colaboradorId", colaboradorId);
    Object.entries(extras).forEach(([k, v]) => v && p.set(k, v));
    return p.toString();
  };

  const aplicar = (extras?: Record<string, string>): boolean => {
    if (faltante) return false;
    setAplicados(armarParams(extras));
    return true;
  };
  const hayCambios = (extras?: Record<string, string>) => aplicados !== null && armarParams(extras) !== aplicados;

  const nombre = (lista: OpcionBuscador[], id: string) => lista.find((o) => o.id === id)?.label ?? "";

  return {
    desde,
    hasta,
    cambiarFechas: (d: string, h: string) => {
      setDesde(d);
      setHasta(h);
    },
    empresas,
    sitios,
    areas,
    empresaId,
    sitioId,
    areaId,
    cambiarEmpresa,
    cambiarSitio,
    cambiarArea,
    supervisores,
    colaboradores,
    supervisorId,
    colaboradorId,
    cambiarSupervisor,
    cambiarColaborador: setColaboradorId,
    cargandoEstructura: !estructura && !errorEstructura,
    cargandoPersonas,
    sinAsignaciones: !!estructura?.sinAsignaciones,
    conSupervisor,
    faltante,
    aplicados,
    aplicar,
    hayCambios,
    nombreEmpresa: nombre(empresas, empresaId),
    nombreSitio: nombre(sitios, sitioId),
  };
}

export type BuscadorHistorial = ReturnType<typeof useBuscadorHistorial>;
