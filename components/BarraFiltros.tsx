// components/BarraFiltros.tsx
// Barra compacta de filtros compartida por las pantallas con tabla: en
// vez de una tarjeta grande con todos los combos siempre a la vista (que
// empujaba la tabla hacia abajo), queda una sola fila con la búsqueda, un
// botón "Filtros" con el número de filtros activos y las acciones propias
// de la pantalla. Los campos de filtro viven en un panel lateral (hoja
// desde abajo en móvil), y lo que está filtrado se ve como chips que se
// pueden quitar de a uno sin abrir el panel.
//
// Dos modos, según la pantalla:
// - Filtrado en vivo (sin onAplicar): cada cambio ya filtra la tabla; el
//   botón principal del panel solo lo cierra ("Ver resultados").
// - Con búsqueda al servidor (con onAplicar, ej. historiales): los campos
//   se eligen primero y el botón principal ("Buscar") dispara la consulta.
//   Ahí los chips muestran lo que se BUSCÓ (no lo que se está eligiendo
//   todavía en el panel), y si hay diferencias se avisa "sin aplicar".
//
// Atajo: la tecla F abre el panel (fuera de un campo de texto).

"use client";

import { useEffect, useState, type ReactNode } from "react";
import Modal from "./Modal";
import { IconoFiltro, IconoLupa, IconoX } from "./Icons";
import { formatearFecha } from "../lib/fechas";
import ComboboxBuscable from "./ComboboxBuscable";
import SelectorModerno from "./SelectorModerno";
import type { useFiltroEmpresaSitioArea } from "../lib/useFiltroEmpresaSitioArea";

export type ChipFiltro = {
  id: string;
  etiqueta: string;
  // Sin onQuitar el chip se muestra pero no se puede quitar (ej. el rango
  // de fechas obligatorio de los historiales).
  onQuitar?: () => void;
};

// Chip de un combo con opciones {id, label}: null si no hay nada elegido.
export function chipOpcion(
  nombre: string,
  opciones: { id: string; label: string }[],
  valor: string,
  onQuitar?: () => void
): ChipFiltro | null {
  if (!valor) return null;
  const etiqueta = opciones.find((o) => o.id === valor)?.label;
  // Mientras las opciones siguen cargando no hay etiqueta que mostrar
  // todavía; un chip "Empresa: " vacío se vería roto.
  return { id: nombre, etiqueta: etiqueta ? `${nombre}: ${etiqueta}` : nombre, onQuitar };
}

export function chipRangoFechas(desde: string, hasta: string, onQuitar?: () => void, nombre = "Fecha"): ChipFiltro | null {
  if (!desde || !hasta) return null;
  const texto = desde === hasta ? formatearFecha(desde) : `${formatearFecha(desde)} — ${formatearFecha(hasta)}`;
  return { id: nombre, etiqueta: `${nombre}: ${texto}`, onQuitar };
}

// Arma la lista final descartando los null de chipOpcion/chipRangoFechas.
export function chips(...lista: (ChipFiltro | null | false | undefined)[]): ChipFiltro[] {
  return lista.filter((c): c is ChipFiltro => !!c);
}

const firmaChips = (lista: ChipFiltro[]) => lista.map((c) => `${c.id}=${c.etiqueta}`).join("|");

export function CampoFiltro({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <div>
      <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">{etiqueta}</label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

// --- Filtro de Estado Activo/Inactivo (colaboradores, supervisores,
// rutas): arranca en "Activos" y ese valor por defecto no cuenta como
// filtro (sin chip); elegir Inactivos o Todos sí muestra chip, y quitarlo
// vuelve a Activos.
export type FiltroActivo = "ACTIVO" | "INACTIVO" | "";

export function cumpleFiltroActivo(filtro: FiltroActivo, activo: boolean): boolean {
  return !filtro || activo === (filtro === "ACTIVO");
}

export function CampoEstadoActivo({
  valor,
  onCambiar,
  femenino = false,
}: {
  valor: FiltroActivo;
  onCambiar: (v: FiltroActivo) => void;
  femenino?: boolean;
}) {
  return (
    <CampoFiltro etiqueta="Estado">
      <SelectorModerno
        opciones={[
          { value: "ACTIVO", label: femenino ? "Activas" : "Activos" },
          { value: "INACTIVO", label: femenino ? "Inactivas" : "Inactivos" },
          { value: "", label: "Todos" },
        ]}
        value={valor}
        onChange={(v) => onCambiar(v as FiltroActivo)}
      />
    </CampoFiltro>
  );
}

export function chipEstadoActivo(valor: FiltroActivo, onQuitar: () => void, femenino = false): ChipFiltro | null {
  if (valor === "ACTIVO") return null;
  const texto = valor === "INACTIVO" ? (femenino ? "Inactivas" : "Inactivos") : "Todos";
  return { id: "Estado", etiqueta: `Estado: ${texto}`, onQuitar };
}

// --- Piezas para el filtro en cascada Empresa -> Sitio -> Área (ver
// lib/useFiltroEmpresaSitioArea), igual en todas las pantallas que lo usan.
type FiltroUbicacion = Pick<
  ReturnType<typeof useFiltroEmpresaSitioArea>,
  "empresaFiltro" | "sitioFiltro" | "areaFiltro" | "sitiosFiltro" | "areasFiltro" | "cambiarEmpresaFiltro" | "cambiarSitioFiltro" | "cambiarAreaFiltro"
>;

export function CamposEmpresaSitioArea({ empresas, filtro }: { empresas: { id: string; label: string }[]; filtro: FiltroUbicacion }) {
  return (
    <>
      <CampoFiltro etiqueta="Empresa">
        <ComboboxBuscable opciones={empresas} value={filtro.empresaFiltro} onChange={filtro.cambiarEmpresaFiltro} placeholder="Todos" />
      </CampoFiltro>
      <CampoFiltro etiqueta="Sitio">
        <ComboboxBuscable opciones={filtro.sitiosFiltro} value={filtro.sitioFiltro} onChange={filtro.cambiarSitioFiltro} placeholder="Todos" />
      </CampoFiltro>
      <CampoFiltro etiqueta="Área">
        <ComboboxBuscable opciones={filtro.areasFiltro} value={filtro.areaFiltro} onChange={filtro.cambiarAreaFiltro} placeholder="Todos" />
      </CampoFiltro>
    </>
  );
}

// Quitar la empresa limpia también sitio y área (así funciona la cascada),
// y quitar el sitio limpia el área.
export function chipsEmpresaSitioArea(
  empresas: { id: string; label: string }[],
  filtro: FiltroUbicacion,
  despuesDeQuitar?: () => void
): (ChipFiltro | null)[] {
  return [
    chipOpcion("Empresa", empresas, filtro.empresaFiltro, () => { filtro.cambiarEmpresaFiltro(""); despuesDeQuitar?.(); }),
    chipOpcion("Sitio", filtro.sitiosFiltro, filtro.sitioFiltro, () => { filtro.cambiarSitioFiltro(""); despuesDeQuitar?.(); }),
    chipOpcion("Área", filtro.areasFiltro, filtro.areaFiltro, () => { filtro.cambiarAreaFiltro(""); despuesDeQuitar?.(); }),
  ];
}

export default function BarraFiltros({
  busqueda,
  chips: chipsActuales,
  onLimpiar,
  onAplicar,
  textoAplicar = "Buscar",
  aplicando = false,
  aplicarDeshabilitado = false,
  resultados,
  destacado,
  acciones,
  children,
}: {
  // onEnter: para búsquedas que consultan al servidor (no filtran en vivo).
  busqueda?: { valor: string; onCambiar: (v: string) => void; placeholder: string; onEnter?: () => void; className?: string };
  chips: ChipFiltro[];
  onLimpiar: () => void;
  onAplicar?: () => void;
  textoAplicar?: string;
  aplicando?: boolean;
  aplicarDeshabilitado?: boolean;
  // Solo en modo en vivo: cuántas filas quedan con los filtros actuales,
  // para que el botón diga "Ver 23 resultados" en vez de un genérico.
  resultados?: number;
  // Un filtro principal que conviene tener siempre a mano en la barra en
  // vez de dentro del panel (ej. el rango de fechas de los historiales).
  destacado?: ReactNode;
  acciones?: ReactNode;
  children: ReactNode;
}) {
  const [abierto, setAbierto] = useState(false);
  const cerrar = () => setAbierto(false);

  // Modo servidor: foto de los chips en el momento en que arranca cada
  // búsqueda (el flanco de "aplicando", sin importar si la disparó el
  // panel, el botón Buscar propio de la pantalla o quitar un chip). Se
  // guarda durante el render (patrón "valor del render anterior") en vez
  // de en un efecto, para no pintar un cuadro con los chips viejos.
  const [chipsAplicados, setChipsAplicados] = useState<ChipFiltro[] | null>(null);
  const [aplicandoAnterior, setAplicandoAnterior] = useState(aplicando);
  if (aplicando !== aplicandoAnterior) {
    setAplicandoAnterior(aplicando);
    if (aplicando) setChipsAplicados(chipsActuales);
  }
  const modoServidor = !!onAplicar;
  const chips = modoServidor && chipsAplicados ? chipsAplicados : chipsActuales;
  const sinAplicar = modoServidor && chipsAplicados !== null && firmaChips(chipsAplicados) !== firmaChips(chipsActuales);
  const hayQuitables = chips.some((c) => c.onQuitar);

  useEffect(() => {
    const alPresionar = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== "f" || e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
      const objetivo = e.target as HTMLElement | null;
      if (objetivo && (objetivo.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(objetivo.tagName))) return;
      // Con otro modal ya abierto (confirmación, formulario) no se apila.
      if (document.querySelector('[role="dialog"]')) return;
      e.preventDefault();
      setAbierto(true);
    };
    window.addEventListener("keydown", alPresionar);
    return () => window.removeEventListener("keydown", alPresionar);
  }, []);

  const confirmar = () => {
    if (onAplicar) {
      if (aplicarDeshabilitado) return;
      onAplicar();
    }
    cerrar();
  };

  const textoPrincipal = onAplicar
    ? aplicando
      ? "Buscando..."
      : textoAplicar
    : resultados === undefined
    ? "Ver resultados"
    : resultados === 1
    ? "Ver 1 resultado"
    : `Ver ${resultados} resultados`;

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center gap-2">
        {busqueda && (
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <IconoLupa className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 dark:text-neutral-500 pointer-events-none" />
            <input
              value={busqueda.valor}
              onChange={(e) => busqueda.onCambiar(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && busqueda.onEnter) {
                  e.preventDefault();
                  busqueda.onEnter();
                }
              }}
              placeholder={busqueda.placeholder}
              className={`${busqueda.className ?? ""} w-full rounded-xl border border-neutral-300 bg-white text-neutral-900 pl-10 pr-4 py-2.5 text-sm placeholder-neutral-500 focus:border-orange-400 focus:ring-2 focus:ring-orange-500/15 outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-white`}
            />
          </div>
        )}
        {destacado && <div className="w-full sm:w-72">{destacado}</div>}
        <button
          type="button"
          onClick={() => setAbierto(true)}
          title="Filtros (F)"
          className="relative inline-flex items-center gap-2 rounded-xl border border-neutral-300 bg-white px-3.5 py-2.5 text-sm font-medium text-neutral-700 hover:border-orange-400 hover:text-orange-600 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:border-orange-400 dark:hover:text-orange-400 transition"
        >
          <IconoFiltro className="w-4 h-4" />
          Filtros
          {chips.length > 0 && (
            <span className="min-w-5 h-5 px-1.5 rounded-full bg-orange-500 text-white text-[11px] font-semibold flex items-center justify-center">
              {chips.length}
            </span>
          )}
          {sinAplicar && (
            <span title="Hay cambios sin aplicar" className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-500 ring-2 ring-white dark:ring-neutral-950 animate-pulse" />
          )}
        </button>
        {acciones && <div className="flex flex-wrap items-center gap-2 sm:ml-auto">{acciones}</div>}
      </div>

      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {chips.map((c) => (
            <span
              key={c.id}
              className="animate-[dropdown-in_0.15s_ease-out] inline-flex items-center gap-1 rounded-full bg-orange-50 text-orange-700 ring-1 ring-orange-200 dark:bg-orange-500/10 dark:text-orange-300 dark:ring-orange-500/20 pl-3 pr-1.5 py-1 text-xs font-medium max-w-full"
            >
              <span className="truncate">{c.etiqueta}</span>
              {c.onQuitar ? (
                <button
                  type="button"
                  onClick={c.onQuitar}
                  title="Quitar filtro"
                  className="shrink-0 rounded-full p-0.5 hover:bg-orange-100 dark:hover:bg-orange-500/20 transition"
                >
                  <IconoX className="w-3 h-3" />
                </button>
              ) : (
                <span className="w-1.5" />
              )}
            </span>
          ))}
          {hayQuitables && (
            <button
              type="button"
              onClick={onLimpiar}
              className="text-xs font-medium text-neutral-500 hover:text-orange-600 dark:text-neutral-400 dark:hover:text-orange-400 px-2 py-1 transition"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      )}

      <Modal
        abierto={abierto}
        variante="lateral"
        onCerrar={cerrar}
        onConfirmar={confirmar}
        className="w-full sm:w-[420px] max-h-[90dvh] sm:max-h-none sm:h-full bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 rounded-t-3xl sm:rounded-none shadow-2xl flex flex-col"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200 dark:border-neutral-800">
          <div>
            <p className="font-semibold">Filtros</p>
            {sinAplicar ? (
              <p className="text-xs font-medium text-amber-600 dark:text-amber-400">Hay cambios sin aplicar</p>
            ) : (
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {chips.length === 0 ? "Sin filtros activos" : chips.length === 1 ? "1 filtro activo" : `${chips.length} filtros activos`}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={cerrar}
            aria-label="Cerrar filtros"
            className="text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:text-white dark:hover:bg-neutral-800 rounded-lg p-1.5 transition"
          >
            <IconoX className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">{children}</div>

        <div className="flex gap-2 px-5 py-4 border-t border-neutral-200 dark:border-neutral-800 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={onLimpiar}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
          >
            Limpiar
          </button>
          <button
            type="button"
            onClick={confirmar}
            disabled={onAplicar ? aplicarDeshabilitado || aplicando : false}
            className="flex-1 px-4 py-2.5 text-sm font-semibold bg-orange-500 hover:bg-orange-600 text-white rounded-xl disabled:opacity-50 transition"
          >
            {textoPrincipal}
          </button>
        </div>
      </Modal>
    </div>
  );
}
