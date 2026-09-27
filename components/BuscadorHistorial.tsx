// components/BuscadorHistorial.tsx
// Buscador de los historiales (TH, Coordinación, Nómina) sobre la barra
// compacta de siempre (BarraFiltros): en la barra quedan el rango de
// fechas, "Filtros" y "Buscar"; Empresa/Sitio/Área, personas y los extras
// de cada pantalla viven en el panel lateral. Nada se consulta hasta pulsar
// Buscar (en la barra o en el panel); los chips muestran lo que se BUSCÓ y
// la barra avisa si hay cambios sin aplicar. Estado/lógica en
// lib/useBuscadorHistorial.ts.

"use client";

import { useEffect, useState, type ReactNode } from "react";
import RangoFechasSelector from "./RangoFechasSelector";
import ComboboxBuscable from "./ComboboxBuscable";
import Spinner from "./Spinner";
import { IconoLupa } from "./Icons";
import BarraFiltros, { CampoFiltro, chipOpcion, chips, type ChipFiltro } from "./BarraFiltros";
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

export default function BuscadorHistorial({
  buscador: b,
  extras,
  extrasChips = [],
  extrasParams,
  onLimpiarExtras,
  onBuscar,
  buscando,
  acciones,
}: {
  buscador: Buscador;
  // Campos propios de la pantalla (ej. Estado): el campo del panel, su
  // chip y su valor (para que cuente en "cambios sin aplicar").
  extras?: ReactNode;
  extrasChips?: (ChipFiltro | null)[];
  extrasParams?: Record<string, string>;
  onLimpiarExtras?: () => void;
  onBuscar: () => void;
  buscando: boolean;
  // Botones de la pantalla (Vista, Exportar, Imprimir).
  acciones?: ReactNode;
}) {
  const deshabilitado = buscando || !!b.faltante || b.sinAsignaciones;
  const sinAplicar = b.hayCambios(extrasParams);

  // Quitar un chip vuelve a buscar con ese filtro menos (acción explícita
  // del usuario sobre lo ya buscado). Se dispara en el render siguiente,
  // cuando el filtro ya quedó limpio.
  const [pedido, setPedido] = useState(0);
  useEffect(() => {
    if (pedido) onBuscar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pedido]);
  const quitarYBuscar = (limpiar: () => void) => () => {
    limpiar();
    setPedido((n) => n + 1);
  };

  const listaChips = chips(
    b.desde && b.hasta
      ? { id: "fechas", etiqueta: b.desde === b.hasta ? formatearFecha(`${b.desde}T00:00:00Z`) : `${formatearFecha(`${b.desde}T00:00:00Z`)} – ${formatearFecha(`${b.hasta}T00:00:00Z`)}` }
      : null,
    // Con una sola opción (su único alcance) el chip no se puede quitar.
    chipOpcion("Empresa", b.empresas, b.empresaId, b.empresas.length > 1 ? quitarYBuscar(() => b.cambiarEmpresa("")) : undefined),
    chipOpcion("Sitio", b.sitios, b.sitioId, b.sitios.length > 1 ? quitarYBuscar(() => b.cambiarSitio("")) : undefined),
    chipOpcion("Área", b.areas, b.areaId, quitarYBuscar(() => b.cambiarArea(""))),
    ...extrasChips.map((c) => (c?.onQuitar ? { ...c, onQuitar: quitarYBuscar(c.onQuitar) } : c)),
    b.conSupervisor && chipOpcion("Supervisor", b.supervisores, b.supervisorId, quitarYBuscar(() => b.cambiarSupervisor(""))),
    chipOpcion("Colaborador", b.colaboradores, b.colaboradorId, quitarYBuscar(() => b.cambiarColaborador("")))
  );

  const limpiar = () => {
    b.cambiarEmpresa("");
    onLimpiarExtras?.();
  };

  return (
    <BarraFiltros
      chips={listaChips}
      onLimpiar={limpiar}
      onAplicar={onBuscar}
      textoAplicar="Buscar"
      aplicando={buscando}
      aplicarDeshabilitado={deshabilitado}
      destacado={<RangoFechasSelector desde={b.desde} hasta={b.hasta} onChange={b.cambiarFechas} />}
      acciones={
        <>
          <button
            type="button"
            onClick={onBuscar}
            disabled={deshabilitado}
            title={b.faltante ? `${b.faltante} (en Filtros)` : sinAplicar ? "Hay cambios sin aplicar" : "Buscar"}
            className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition disabled:opacity-50 disabled:cursor-not-allowed ${
              sinAplicar ? "bg-amber-500 hover:bg-amber-600" : "bg-orange-500 hover:bg-orange-600"
            }`}
          >
            {buscando ? <Spinner className="w-4 h-4" /> : <IconoLupa className="w-4 h-4" />}
            {buscando ? "Buscando..." : "Buscar"}
          </button>
          {acciones}
        </>
      }
    >
      {b.sinAsignaciones ? (
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          No tienes ninguna Empresa/Sitio/Área asignada todavía.
        </p>
      ) : (
        <>
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
                placeholder={b.sitioId ? "Todos" : "Primero el sitio"}
                cargando={b.cargandoPersonas}
              />
            </CampoFiltro>
          )}
          <CampoFiltro etiqueta="Colaborador">
            <ComboboxBuscable
              opciones={[{ id: "", label: "Todos" }, ...b.colaboradores]}
              value={b.colaboradorId}
              onChange={b.cambiarColaborador}
              placeholder={b.sitioId ? "Todos" : "Primero el sitio"}
              cargando={b.cargandoPersonas}
            />
          </CampoFiltro>

          {b.faltante && <p className="text-xs font-medium text-amber-600 dark:text-amber-400">{b.faltante} para poder buscar.</p>}
        </>
      )}
    </BarraFiltros>
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
