// components/BuscadorHistorial.tsx
// Buscador de los historiales (aprobaciones, revisiones, pagos, general):
// una barra redondeada con los filtros principales a la vista (Fechas ·
// Empresa y Sitio · Área · Más filtros) y el botón Buscar; en celular se
// resume en una línea. Tocar un segmento abre el calendario (Fechas) o el
// panel con todos los filtros. Debajo: resumen del resultado, vista y
// "Exportar ▾". Nada se consulta hasta pulsar Buscar; si se cambia algo sin
// buscar, Buscar se pone ámbar. Estado/lógica en lib/useBuscadorHistorial.ts.

"use client";

import { useState, type ReactNode } from "react";
import RangoFechasSelector from "./RangoFechasSelector";
import ComboboxBuscable from "./ComboboxBuscable";
import Spinner from "./Spinner";
import Modal from "./Modal";
import MenuExportar, { type OpcionExportar } from "./MenuExportar";
import { IconoLupa, IconoX } from "./Icons";
import { CampoFiltro, chipOpcion, chips, type ChipFiltro } from "./BarraFiltros";
import { formatearFecha } from "../lib/fechas";
import type { BuscadorHistorial as Buscador, OpcionBuscador } from "../lib/useBuscadorHistorial";

// Mismo estilo de campo que el resto del panel de filtros.
export const Campo = CampoFiltro;

// Con una sola opción no hay nada que elegir: se muestra fija (es el
// alcance asignado del usuario), en vez de un combo con un único ítem.
function ComboAlcance({
  opciones,
  valor,
  onCambiar,
  placeholder,
  cargando,
  todas,
  siempreCombo,
}: {
  opciones: OpcionBuscador[];
  valor: string;
  onCambiar: (v: string) => void;
  placeholder: string;
  cargando?: boolean;
  // Texto de la opción vacía ("Todas"/"Todos").
  todas: string;
  // Área: aunque haya una sola, se deja elegir "Todas" o esa.
  siempreCombo?: boolean;
}) {
  if (opciones.length === 1 && !siempreCombo) {
    return (
      <div
        className="flex items-center rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-2.5 text-sm font-medium text-neutral-700 dark:border-neutral-800 dark:bg-neutral-800/60 dark:text-neutral-200 truncate"
        title="Tu único alcance asignado"
      >
        {opciones[0].label}
      </div>
    );
  }
  return (
    <ComboboxBuscable
      opciones={[{ id: "", label: todas }, ...opciones]}
      value={valor}
      onChange={onCambiar}
      placeholder={placeholder}
      cargando={cargando}
    />
  );
}

// Segmento de la barra redondeada (escritorio): etiqueta chica + valor.
function Segmento({
  etiqueta,
  valor,
  vacio,
  onClick,
  activo,
}: {
  etiqueta: string;
  valor: string;
  vacio?: boolean;
  onClick: () => void;
  activo?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-w-0 flex-1 flex-col items-start gap-0.5 rounded-full px-5 py-2 text-left transition hover:bg-neutral-100 dark:hover:bg-neutral-800 ${activo ? "bg-neutral-100 dark:bg-neutral-800" : ""}`}
    >
      <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">{etiqueta}</span>
      <span className={`w-full truncate text-sm ${vacio ? "font-medium text-neutral-500 dark:text-neutral-400" : "font-semibold text-neutral-900 dark:text-white"}`}>
        {valor}
      </span>
    </button>
  );
}

const Divisor = () => <span aria-hidden="true" className="my-2.5 w-px shrink-0 bg-neutral-200 dark:bg-neutral-700" />;

export default function BuscadorHistorial({
  buscador: b,
  extras,
  extrasChips = [],
  extrasParams,
  onLimpiarExtras,
  onBuscar,
  buscando,
  vista,
  exportar,
  resumen,
}: {
  buscador: Buscador;
  // Campos propios de la pantalla (ej. Estado): el campo del panel, su
  // resumen para el segmento "Más filtros" y su valor (para "sin aplicar").
  extras?: ReactNode;
  extrasChips?: (ChipFiltro | null)[];
  extrasParams?: Record<string, string>;
  onLimpiarExtras?: () => void;
  onBuscar: () => void;
  buscando: boolean;
  // Debajo de la barra: resumen del resultado a la izquierda; selector
  // Lista / Por colaborador y "Exportar ▾" a la derecha.
  vista?: ReactNode;
  exportar?: OpcionExportar[];
  resumen?: ReactNode;
}) {
  const [panelAbierto, setPanelAbierto] = useState(false);
  const deshabilitado = buscando || !!b.faltante || b.sinAsignaciones;
  const sinAplicar = b.hayCambios(extrasParams);

  const buscar = () => {
    if (deshabilitado) return;
    setPanelAbierto(false);
    onBuscar();
  };
  const limpiar = () => {
    b.cambiarEmpresa("");
    onLimpiarExtras?.();
  };

  // Textos de la barra (lo elegido, no lo buscado: la barra es el formulario).
  const nombreArea = b.areas.find((a) => a.id === b.areaId)?.label ?? "";
  const textoFechas = !b.desde || !b.hasta
    ? "Elige el rango"
    : b.desde === b.hasta
    ? formatearFecha(`${b.desde}T00:00:00Z`)
    : `${formatearFecha(`${b.desde}T00:00:00Z`)} – ${formatearFecha(`${b.hasta}T00:00:00Z`)}`;
  const textoEmpresaSitio = `${b.nombreEmpresa || "Todas"} · ${b.nombreSitio || "Todos"}`;
  const masFiltros = chips(
    ...extrasChips,
    b.conSupervisor && chipOpcion("Supervisor", b.supervisores, b.supervisorId),
    chipOpcion("Colaborador", b.colaboradores, b.colaboradorId)
  );
  const textoMas = masFiltros.length === 0
    ? b.conSupervisor
      ? "Estado, supervisor, colaborador"
      : "Colaborador"
    : masFiltros.map((c) => c.etiqueta.replace(/^[^:]+: /, "")).join(" · ");

  const botonBuscar = (
    <button
      type="button"
      onClick={buscar}
      disabled={deshabilitado}
      title={b.faltante ?? (sinAplicar ? "Hay cambios sin aplicar" : "Buscar")}
      className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-full px-6 text-sm font-bold text-white shadow-md transition disabled:cursor-not-allowed disabled:opacity-50 ${
        sinAplicar ? "bg-amber-600 hover:bg-amber-700" : "bg-orange-600 hover:bg-orange-700"
      }`}
    >
      {buscando ? <Spinner className="w-4 h-4" /> : <IconoLupa className="w-4 h-4" />}
      {buscando ? "Buscando..." : "Buscar"}
    </button>
  );

  return (
    <div className="space-y-3">
      {b.sinAsignaciones ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          No tienes ninguna Empresa/Sitio/Área asignada todavía.
        </p>
      ) : (
        <>
          {/* Escritorio: barra redondeada con los filtros principales a la vista */}
          <div className="hidden md:flex items-stretch rounded-full border border-neutral-200 bg-white p-1.5 shadow-[0_6px_24px_rgba(28,25,23,0.08)] dark:border-neutral-800 dark:bg-neutral-900">
            <div className="min-w-0 flex-[1.2]">
              <RangoFechasSelector
                desde={b.desde}
                hasta={b.hasta}
                onChange={b.cambiarFechas}
                renderDisparador={({ abierto, alternar }) => (
                  <Segmento etiqueta="Fechas" valor={textoFechas} vacio={!b.desde || !b.hasta} onClick={alternar} activo={abierto} />
                )}
              />
            </div>
            <Divisor />
            <Segmento etiqueta="Empresa · Sitio" valor={textoEmpresaSitio} vacio={!b.nombreEmpresa && !b.nombreSitio} onClick={() => setPanelAbierto(true)} />
            <Divisor />
            <Segmento etiqueta="Área" valor={nombreArea || "Todas"} vacio={!nombreArea} onClick={() => setPanelAbierto(true)} />
            <Divisor />
            <Segmento etiqueta="Más filtros" valor={textoMas} vacio={masFiltros.length === 0} onClick={() => setPanelAbierto(true)} />
            {botonBuscar}
          </div>

          {/* Celular: una línea que resume todo y abre el panel + botón redondo de buscar */}
          <div className="flex md:hidden items-center gap-2 rounded-full border border-neutral-200 bg-white p-1.5 pl-5 shadow-[0_6px_24px_rgba(28,25,23,0.08)] dark:border-neutral-800 dark:bg-neutral-900">
            <button type="button" onClick={() => setPanelAbierto(true)} className="min-w-0 flex-1 py-1 text-left">
              <span className="block truncate text-sm font-bold text-neutral-900 dark:text-white">{textoFechas}</span>
              <span className="block truncate text-xs text-neutral-500 dark:text-neutral-400">
                {textoEmpresaSitio}
                {nombreArea ? ` · ${nombreArea}` : ""}
                {masFiltros.length > 0 ? ` · +${masFiltros.length} ${masFiltros.length === 1 ? "filtro" : "filtros"}` : ""}
              </span>
            </button>
            <button
              type="button"
              onClick={buscar}
              disabled={deshabilitado}
              aria-label="Buscar"
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white shadow-md transition disabled:opacity-50 ${
                sinAplicar ? "bg-amber-600" : "bg-orange-600"
              }`}
            >
              {buscando ? <Spinner className="w-4 h-4" /> : <IconoLupa className="w-4 h-4" />}
            </button>
          </div>
          {(sinAplicar || b.faltante) && (
            <p className="pl-5 text-xs font-medium text-amber-700 dark:text-amber-400">
              {b.faltante ?? "Cambiaste filtros: pulsa Buscar para actualizar los resultados."}
            </p>
          )}
        </>
      )}

      {(resumen || vista || (exportar && exportar.length > 0)) && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">{resumen}</div>
          <div className="flex items-center gap-2">
            {vista}
            {exportar && exportar.length > 0 && <MenuExportar opciones={exportar} />}
          </div>
        </div>
      )}

      <Modal
        abierto={panelAbierto}
        variante="lateral"
        onCerrar={() => setPanelAbierto(false)}
        onConfirmar={buscar}
        className="w-full sm:w-[420px] max-h-[90dvh] sm:max-h-none sm:h-full bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 rounded-t-3xl sm:rounded-none shadow-2xl flex flex-col"
      >
        <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4 dark:border-neutral-800">
          <div>
            <p className="font-semibold">Buscar en el historial</p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">Elige qué quieres consultar y pulsa Buscar</p>
          </div>
          <button
            type="button"
            onClick={() => setPanelAbierto(false)}
            aria-label="Cerrar"
            className="rounded-lg p-1.5 text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white"
          >
            <IconoX className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
          <CampoFiltro etiqueta="Fechas">
            <RangoFechasSelector desde={b.desde} hasta={b.hasta} onChange={b.cambiarFechas} />
          </CampoFiltro>
          <CampoFiltro etiqueta="Empresa">
            <ComboAlcance opciones={b.empresas} valor={b.empresaId} onCambiar={b.cambiarEmpresa} placeholder="Todas" cargando={b.cargandoEstructura} todas="Todas" />
          </CampoFiltro>
          <CampoFiltro etiqueta="Sitio">
            <ComboAlcance opciones={b.sitios} valor={b.sitioId} onCambiar={b.cambiarSitio} placeholder="Todos" cargando={b.cargandoEstructura} todas="Todos" />
          </CampoFiltro>
          <CampoFiltro etiqueta="Área">
            <ComboAlcance opciones={b.areas} valor={b.areaId} onCambiar={b.cambiarArea} placeholder={b.sitioId ? "Todas" : "Todas (elige un sitio para filtrar)"} todas="Todas" siempreCombo />
          </CampoFiltro>
          {extras}
          {b.conSupervisor && (
            <CampoFiltro etiqueta="Supervisor">
              <ComboboxBuscable
                opciones={[{ id: "", label: "Todos" }, ...b.supervisores]}
                value={b.supervisorId}
                onChange={b.cambiarSupervisor}
                placeholder="Todos"
                cargando={b.cargandoPersonas}
              />
            </CampoFiltro>
          )}
          <CampoFiltro etiqueta="Colaborador">
            <ComboboxBuscable
              opciones={[{ id: "", label: "Todos" }, ...b.colaboradores]}
              value={b.colaboradorId}
              onChange={b.cambiarColaborador}
              placeholder="Todos"
              cargando={b.cargandoPersonas}
            />
          </CampoFiltro>
        </div>
        <div className="flex gap-2 border-t border-neutral-200 px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] dark:border-neutral-800">
          <button
            type="button"
            onClick={limpiar}
            className="flex-1 rounded-xl border border-neutral-200 px-4 py-2.5 text-sm font-medium text-neutral-600 transition hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            Limpiar
          </button>
          <button
            type="button"
            onClick={buscar}
            disabled={deshabilitado}
            className="flex-1 rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-orange-700 disabled:opacity-50"
          >
            {buscando ? "Buscando..." : "Buscar"}
          </button>
        </div>
      </Modal>
    </div>
  );
}

// Resumen del resultado, sobre la tabla: "128 solicitudes · $412,50 en total".
export function ResumenResultado({ principal, secundario }: { principal: string; secundario?: string }) {
  return (
    <p className="flex flex-wrap items-baseline gap-x-2">
      <span className="text-lg font-bold text-neutral-900 dark:text-white">{principal}</span>
      {secundario && <span className="text-sm text-neutral-500 dark:text-neutral-400">{secundario}</span>}
    </p>
  );
}

// Estado inicial de la pantalla: todavía no se buscó nada.
export function AvisoSinBusqueda({ faltante }: { faltante: string | null }) {
  return (
    <div className="border border-dashed border-neutral-300 dark:border-neutral-700 rounded-2xl px-6 py-10 text-center">
      <div className="w-11 h-11 mx-auto rounded-2xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center">
        <IconoLupa className="w-5 h-5" />
      </div>
      <p className="mt-3 text-sm font-semibold text-neutral-800 dark:text-neutral-200">Elige qué quieres consultar</p>
      <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
        {faltante
          ? "Elige el rango de fechas y pulsa Buscar."
          : "Elige el rango de fechas y, si quieres, acota en Filtros (empresa, sitio, área, personas). Luego pulsa Buscar."}
      </p>
    </div>
  );
}
