// components/PanelDashboard.tsx
// Dashboard ejecutivo: KPIs del período elegido (con filtro opcional en
// cascada Empresa -> Sitio -> Área), tendencia mensual (barras apiladas
// por estado, últimos 6 meses) y gasto por Área (dona), con colores e
// interacción siguiendo el skill de dataviz del proyecto.

"use client";

import { useState, useMemo, useEffect } from "react";
import { formatearMoneda } from "../lib/formato";
import RangoFechasSelector from "./RangoFechasSelector";
import ComboboxBuscable from "./ComboboxBuscable";
import Spinner from "./Spinner";
import BarraCarga from "./BarraCarga";
import { fechaHoyTexto } from "../lib/fechas";
import GraficoBarrasMensual, { type FilaMes } from "./GraficoBarrasMensual";
import GraficoPastelAreas from "./GraficoPastelAreas";

type KPI = { cantidad: number; total: number };
type Datos = {
  pendientes: KPI;
  aprobadas: KPI;
  revisadas: KPI;
  pagadas: KPI;
  gastoPorArea: { area: string; total: number }[];
  tendenciaMensual: FilaMes[];
};
type Empresa = { id: string; nombre: string };
type Sitio = { id: string; nombre: string; empresaId: string };
type Area = { id: string; nombre: string; sitioId: string };

// Mismo mapeo de color que en GraficoBarrasMensual — un estado siempre
// se ve del mismo color en toda la pantalla (tarjeta, leyenda y barra).
const TARJETAS_KPI = [
  { clave: "pendientes" as const, label: "Pendientes", color: "#eda100", fondo: "bg-amber-50 dark:bg-amber-500/10", texto: "text-amber-800 dark:text-amber-400" },
  { clave: "aprobadas" as const, label: "Aprobadas", color: "#1baf7a", fondo: "bg-green-50 dark:bg-green-500/10", texto: "text-green-800 dark:text-green-400" },
  { clave: "revisadas" as const, label: "Revisadas", color: "#2a78d6", fondo: "bg-sky-50 dark:bg-sky-500/10", texto: "text-sky-800 dark:text-sky-400" },
  { clave: "pagadas" as const, label: "Pagadas", color: "#eb6834", fondo: "bg-orange-50 dark:bg-orange-500/10", texto: "text-orange-800 dark:text-orange-400" },
];

export default function PanelDashboard() {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [sitios, setSitios] = useState<Sitio[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [cargandoInicial, setCargandoInicial] = useState(true);
  const [errorInicial, setErrorInicial] = useState("");

  useEffect(() => {
    let cancelado = false;
    fetch("/api/dashboard/filtros")
      .then(async (res) => {
        if (cancelado) return;
        if (!res.ok) {
          setErrorInicial("No se pudo cargar la información. Intenta de nuevo.");
          return;
        }
        const data = await res.json();
        setEmpresas(data.empresas);
        setSitios(data.sitios);
        setAreas(data.areas);
      })
      .catch(() => {
        if (!cancelado) setErrorInicial("No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.");
      })
      .finally(() => {
        if (!cancelado) setCargandoInicial(false);
      });
    return () => {
      cancelado = true;
    };
  }, []);

  const [desde, setDesde] = useState(fechaHoyTexto);
  const [hasta, setHasta] = useState(fechaHoyTexto);
  const [empresaId, setEmpresaId] = useState("");
  const [sitioId, setSitioId] = useState("");
  const [areaId, setAreaId] = useState("");
  const [datos, setDatos] = useState<Datos | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  // Se le pasa como `key` a los gráficos para que remonten (y así
  // repitan su animación de entrada) cada vez que llegan datos nuevos.
  const [version, setVersion] = useState(0);

  const sitiosOpciones = useMemo(
    () => (empresaId ? sitios.filter((s) => s.empresaId === empresaId) : sitios).map((s) => ({ id: s.id, label: s.nombre })),
    [sitios, empresaId]
  );
  const sitiosPermitidos = useMemo(
    () => new Set((empresaId ? sitios.filter((s) => s.empresaId === empresaId) : sitios).map((s) => s.id)),
    [sitios, empresaId]
  );
  const areasOpciones = useMemo(() => {
    const base = sitioId ? areas.filter((a) => a.sitioId === sitioId) : areas.filter((a) => sitiosPermitidos.has(a.sitioId));
    return base.map((a) => ({ id: a.id, label: a.nombre }));
  }, [areas, sitioId, sitiosPermitidos]);

  const cambiarEmpresa = (v: string) => { setEmpresaId(v); setSitioId(""); setAreaId(""); };
  const cambiarSitio = (v: string) => { setSitioId(v); setAreaId(""); };

  const buscar = async () => {
    if (!desde || !hasta) {
      setError("Selecciona ambas fechas");
      return;
    }
    setCargando(true);
    setError("");
    const params = new URLSearchParams({ desde, hasta });
    if (empresaId) params.set("empresaId", empresaId);
    if (sitioId) params.set("sitioId", sitioId);
    if (areaId) params.set("areaId", areaId);
    try {
      const res = await fetch(`/api/dashboard/kpis?${params.toString()}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "No se pudo cargar el dashboard");
        return;
      }
      setDatos(await res.json());
      setVersion((v) => v + 1);
    } catch {
      setError("No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="flex-1 px-4 sm:px-8 pb-5 space-y-4">
      {errorInicial && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{errorInicial}</div>
      )}

      {cargandoInicial ? (
        <BarraCarga />
      ) : (
      <>
      <div className="bg-neutral-50 dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 rounded-2xl p-5 shadow-sm ring-1 ring-black/5 dark:ring-white/10 space-y-3">
        <div className="max-w-xs">
          <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Rango de fechas</label>
          <div className="mt-1.5">
            <RangoFechasSelector desde={desde} hasta={hasta} onChange={(d, h) => { setDesde(d); setHasta(h); }} />
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400 mb-1.5">Filtrar por (opcional)</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <ComboboxBuscable
              opciones={empresas.map((e) => ({ id: e.id, label: e.nombre }))}
              value={empresaId}
              onChange={cambiarEmpresa}
              placeholder="Empresa"
            />
            <ComboboxBuscable opciones={sitiosOpciones} value={sitioId} onChange={cambiarSitio} placeholder="Sitio" />
            <ComboboxBuscable opciones={areasOpciones} value={areaId} onChange={setAreaId} placeholder="Área" />
          </div>
        </div>

        <button
          onClick={buscar}
          disabled={cargando}
          className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-5 py-2.5 rounded-xl transition shadow-sm hover:shadow-md disabled:opacity-50 flex items-center gap-2"
        >
          {cargando && <Spinner className="w-4 h-4" />}
          {cargando ? "Cargando..." : "Actualizar"}
        </button>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      {!datos && !error && (
        <p className="text-sm text-neutral-500 dark:text-neutral-400">Elige un rango de fechas y presiona Actualizar para ver los datos.</p>
      )}

      {datos && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {TARJETAS_KPI.map((t) => {
              const kpi = datos[t.clave];
              return (
                <div
                  key={t.clave}
                  className={`${t.fondo} border border-black/5 dark:border-white/10 rounded-2xl p-4 sm:p-5 shadow-sm transition hover:shadow-md hover:-translate-y-0.5`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
                    <p className={`text-xs font-semibold uppercase tracking-wide ${t.texto}`}>{t.label}</p>
                  </div>
                  <p className="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-white mt-1.5">{kpi.cantidad}</p>
                  <p className={`text-sm ${t.texto} mt-0.5`}>{formatearMoneda(kpi.total)}</p>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-neutral-50 dark:bg-neutral-900 rounded-2xl p-5 shadow-sm ring-1 ring-black/5 dark:ring-white/10 transition hover:shadow-md hover:-translate-y-0.5">
              <h2 className="font-semibold text-sm text-neutral-800 dark:text-neutral-200">Solicitudes por mes</h2>
              <p className="text-xs text-neutral-400 dark:text-neutral-500 mb-3">Últimos 6 meses, por estado</p>
              <GraficoBarrasMensual key={version} datos={datos.tendenciaMensual} />
            </div>

            <div className="bg-neutral-50 dark:bg-neutral-900 rounded-2xl p-5 shadow-sm ring-1 ring-black/5 dark:ring-white/10 transition hover:shadow-md hover:-translate-y-0.5">
              <h2 className="font-semibold text-sm text-neutral-800 dark:text-neutral-200">Gasto por Área</h2>
              <p className="text-xs text-neutral-400 dark:text-neutral-500 mb-3">Aprobado + Revisado + Pagado, período seleccionado</p>
              <GraficoPastelAreas key={version} datos={datos.gastoPorArea} />
            </div>
          </div>
        </>
      )}
      </>
      )}
    </div>
  );
}
