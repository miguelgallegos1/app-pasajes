// components/PanelDashboard.tsx
// Dashboard ejecutivo: KPIs del período elegido (con filtro opcional en
// cascada Empresa -> Sitio -> Área), tendencia mensual (barras apiladas
// por estado y por valor, últimos 6 meses), gasto por Área (dona) y top 20
// de colaboradores por valor en esos 6 meses, con colores e
// interacción siguiendo el skill de dataviz del proyecto.

"use client";

import { useState, useMemo, useEffect } from "react";
import { formatearMoneda } from "../lib/formato";
import RangoFechasSelector from "./RangoFechasSelector";
import ComboboxBuscable from "./ComboboxBuscable";
import BarraFiltros, { CampoFiltro, chipOpcion, chips } from "./BarraFiltros";
import { useReportarCarga } from "../lib/cargaGlobal";
import { fechaHoyTexto } from "../lib/fechas";
import GraficoBarrasMensual, { type FilaMes } from "./GraficoBarrasMensual";
import GraficoPastelAreas from "./GraficoPastelAreas";
import TopColaboradores, { type FilaTopColaborador } from "./TopColaboradores";

type KPI = { cantidad: number; total: number };
type Datos = {
  pendientes: KPI;
  aprobadas: KPI;
  revisadas: KPI;
  pagadas: KPI;
  gastoPorArea: { area: string; total: number }[];
  tendenciaMensual: FilaMes[];
  topColaboradores: FilaTopColaborador[];
};
type Empresa = { id: string; nombre: string };
type Sitio = { id: string; nombre: string; empresaId: string };
type Area = { id: string; nombre: string; sitioId: string };

// Mismo mapeo de color que en GraficoBarrasMensual — un estado siempre
// se ve del mismo color en toda la pantalla (tarjeta, leyenda y barra).
const TARJETAS_KPI = [
  { clave: "pendientes" as const, label: "Pendientes", color: "#eda100", fondo: "from-amber-50 dark:from-amber-500/15", texto: "text-amber-800 dark:text-amber-400" },
  { clave: "aprobadas" as const, label: "Aprobadas", color: "#1baf7a", fondo: "from-green-50 dark:from-green-500/15", texto: "text-green-800 dark:text-green-400" },
  { clave: "revisadas" as const, label: "Revisadas", color: "#2a78d6", fondo: "from-sky-50 dark:from-sky-500/15", texto: "text-sky-800 dark:text-sky-400" },
  { clave: "pagadas" as const, label: "Pagadas", color: "#eb6834", fondo: "from-orange-50 dark:from-orange-500/15", texto: "text-orange-800 dark:text-orange-400" },
];

// Tarjeta blanca (oscura en tema oscuro) de cada gráfico, con una franja
// de color arriba y el ícono en un cuadrito del mismo degradado.
function TarjetaGrafico({
  titulo,
  subtitulo,
  degradado,
  icono,
  children,
}: {
  titulo: string;
  subtitulo: string;
  degradado: string;
  icono: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="relative overflow-hidden bg-white dark:bg-neutral-900 rounded-3xl p-5 sm:p-6 shadow-sm ring-1 ring-black/5 dark:ring-white/10 transition hover:shadow-lg">
      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${degradado}`} />
      <div className="flex items-center gap-3 mb-4">
        <span className={`w-10 h-10 rounded-2xl grid place-items-center shrink-0 text-white shadow-md bg-gradient-to-br ${degradado}`}>
          {icono}
        </span>
        <div className="min-w-0">
          <h2 className="font-bold text-base text-neutral-900 dark:text-white">{titulo}</h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">{subtitulo}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

const PROPS_ICONO = {
  viewBox: "0 0 24 24",
  className: "w-5 h-5",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};
const ICONO_BARRAS = (
  <svg {...PROPS_ICONO}>
    <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
  </svg>
);
const ICONO_DONA = (
  <svg {...PROPS_ICONO}>
    <path d="M12 3a9 9 0 1 0 9 9h-9z" />
    <path d="M15 3.5A9 9 0 0 1 20.5 9H15z" />
  </svg>
);
// Billete: el top es de los que más gastan.
const ICONO_DINERO = (
  <svg {...PROPS_ICONO}>
    <rect x="2" y="6" width="20" height="12" rx="2" />
    <circle cx="12" cy="12" r="2.5" />
    <path d="M6 12h.01M18 12h.01" />
  </svg>
);

export default function PanelDashboard() {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [sitios, setSitios] = useState<Sitio[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [cargandoInicial, setCargandoInicial] = useState(true);
  const [errorInicial, setErrorInicial] = useState("");
  useReportarCarga(cargandoInicial);

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
  // Cada búsqueda de KPIs también enciende la franja naranja de arriba.
  useReportarCarga(cargando);
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

  // Carga sola al entrar, al cambiar el rango de fechas y al quitar un
  // chip — Empresa/Sitio/Área se aplican juntos desde el panel. En un
  // efecto porque buscar() arma la URL con el estado de ESTE render.
  const [pedidoBusqueda, setPedidoBusqueda] = useState(1);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- dispara una consulta de red
    if (pedidoBusqueda) buscar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pedidoBusqueda]);
  const rebuscar = () => setPedidoBusqueda((n) => n + 1);

  const empresasOpciones = useMemo(() => empresas.map((e) => ({ id: e.id, label: e.nombre })), [empresas]);
  const chipsFiltros = chips(
    chipOpcion("Empresa", empresasOpciones, empresaId, () => { cambiarEmpresa(""); rebuscar(); }),
    chipOpcion("Sitio", sitiosOpciones, sitioId, () => { cambiarSitio(""); rebuscar(); }),
    chipOpcion("Área", areasOpciones, areaId, () => { setAreaId(""); rebuscar(); })
  );

  return (
    <div className="flex-1 px-4 sm:px-8 pb-5 space-y-4">
      {errorInicial && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{errorInicial}</div>
      )}

      {!cargandoInicial && (
      <>
      <BarraFiltros
        chips={chipsFiltros}
        onLimpiar={() => { cambiarEmpresa(""); rebuscar(); }}
        onAplicar={buscar}
        aplicando={cargando}
        textoAplicar="Aplicar"
        destacado={
          <RangoFechasSelector desde={desde} hasta={hasta} onChange={(d, h) => { setDesde(d); setHasta(h); rebuscar(); }} />
        }
      >
        <CampoFiltro etiqueta="Empresa">
          <ComboboxBuscable opciones={empresasOpciones} value={empresaId} onChange={cambiarEmpresa} placeholder="Todos" />
        </CampoFiltro>
        <CampoFiltro etiqueta="Sitio">
          <ComboboxBuscable opciones={sitiosOpciones} value={sitioId} onChange={cambiarSitio} placeholder="Todos" />
        </CampoFiltro>
        <CampoFiltro etiqueta="Área">
          <ComboboxBuscable opciones={areasOpciones} value={areaId} onChange={setAreaId} placeholder="Todos" />
        </CampoFiltro>
      </BarraFiltros>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {datos && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            {TARJETAS_KPI.map((t) => {
              const kpi = datos[t.clave];
              return (
                <div
                  key={t.clave}
                  className={`relative overflow-hidden bg-gradient-to-br ${t.fondo} to-white dark:to-neutral-900 ring-1 ring-black/5 dark:ring-white/10 rounded-3xl p-4 sm:p-5 shadow-sm transition hover:shadow-lg hover:-translate-y-1`}
                >
                  {/* Círculo decorativo del color del estado, en la esquina */}
                  <span
                    aria-hidden="true"
                    className="absolute -right-6 -top-6 w-24 h-24 rounded-full opacity-15 dark:opacity-25"
                    style={{ backgroundColor: t.color }}
                  />
                  <div className="relative flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0 ring-4 ring-white/70 dark:ring-white/10" style={{ backgroundColor: t.color }} />
                    <p className={`text-xs font-bold uppercase tracking-wide ${t.texto}`}>{t.label}</p>
                  </div>
                  <p className="relative text-3xl sm:text-4xl font-extrabold tracking-tight text-neutral-900 dark:text-white mt-2">{kpi.cantidad}</p>
                  <p className={`relative text-sm font-semibold ${t.texto} mt-0.5`}>{formatearMoneda(kpi.total)}</p>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <TarjetaGrafico
              titulo="Solicitudes por mes"
              subtitulo="Valor de los últimos 6 meses, por estado"
              degradado="from-orange-500 to-amber-400"
              icono={ICONO_BARRAS}
            >
              <GraficoBarrasMensual key={version} datos={datos.tendenciaMensual} />
            </TarjetaGrafico>

            <TarjetaGrafico
              titulo="Gasto por Área"
              subtitulo="Aprobado + Revisado + Pagado, período seleccionado"
              degradado="from-fuchsia-500 to-pink-400"
              icono={ICONO_DONA}
            >
              <GraficoPastelAreas key={version} datos={datos.gastoPorArea} />
            </TarjetaGrafico>
          </div>

          <TarjetaGrafico
            titulo="Top 20 colaboradores"
            subtitulo="Los que más gastan en pasajes, últimos 6 meses"
            degradado="from-red-500 to-rose-600"
            icono={ICONO_DINERO}
          >
            <TopColaboradores key={version} datos={datos.topColaboradores} />
          </TarjetaGrafico>
        </>
      )}
      </>
      )}
    </div>
  );
}
