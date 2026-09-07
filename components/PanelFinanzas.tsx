// components/PanelFinanzas.tsx
// Panel de Finanzas: filtros en cascada Empresa -> Sitio -> Área ->
// Colaborador (sin mezclar el orden), selección múltiple, buscador,
// paginación, y conteo + total SIEMPRE visibles.

"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import ComboboxBuscable from "./ComboboxBuscable";
import Paginacion from "./Paginacion";
import { formatearFecha } from "../lib/fechas";
import Spinner from "./Spinner";
import { useToast } from "./Toast";

type Aprobada = {
  id: string;
  fecha: string;
  fechaAprobacion: string | null;
  montoTotal: number;
  colaboradorId: string;
  nombreColaborador: string;
  empresaId: string;
  empresaNombre: string;
  sitioId: string;
  sitioNombre: string;
  areaId: string;
  areaNombre: string;
  rutaNombre: string;
};

const POR_PAGINA = 8;

// Extrae opciones únicas {id, label} de una lista, según los campos indicados
function opcionesUnicas<T>(items: T[], idKey: keyof T, labelKey: keyof T) {
  const vistos = new Map<string, string>();
  for (const item of items) {
    const id = String(item[idKey]);
    if (!vistos.has(id)) vistos.set(id, String(item[labelKey]));
  }
  return Array.from(vistos.entries()).map(([id, label]) => ({ id, label }));
}

export default function PanelFinanzas({
  esSuperAdmin,
  aprobadas,
}: {
  esSuperAdmin: boolean;
  aprobadas: Aprobada[];
}) {
  const router = useRouter();
  const toast = useToast();

  const [busqueda, setBusqueda] = useState("");
  const [empresaId, setEmpresaId] = useState("");
  const [sitioId, setSitioId] = useState("");
  const [areaId, setAreaId] = useState("");
  const [colaboradorId, setColaboradorId] = useState("");
  const [paginaActual, setPaginaActual] = useState(1);

  // Cada nivel de filtro solo ofrece opciones dentro del nivel anterior
  // (esto es lo que evita "mezclar": no puedes elegir un Sitio de otra Empresa)
  const empresasOpciones = useMemo(() => opcionesUnicas(aprobadas, "empresaId", "empresaNombre"), [aprobadas]);

  const sitiosBase = useMemo(
    () => (empresaId ? aprobadas.filter((a) => a.empresaId === empresaId) : aprobadas),
    [aprobadas, empresaId]
  );
  const sitiosOpciones = useMemo(() => opcionesUnicas(sitiosBase, "sitioId", "sitioNombre"), [sitiosBase]);

  const areasBase = useMemo(
    () => (sitioId ? sitiosBase.filter((a) => a.sitioId === sitioId) : sitiosBase),
    [sitiosBase, sitioId]
  );
  const areasOpciones = useMemo(() => opcionesUnicas(areasBase, "areaId", "areaNombre"), [areasBase]);

  const colaboradoresBase = useMemo(
    () => (areaId ? areasBase.filter((a) => a.areaId === areaId) : areasBase),
    [areasBase, areaId]
  );
  const colaboradoresOpciones = useMemo(
    () => opcionesUnicas(colaboradoresBase, "colaboradorId", "nombreColaborador"),
    [colaboradoresBase]
  );

  const cambiarEmpresa = (v: string) => { setEmpresaId(v); setSitioId(""); setAreaId(""); setColaboradorId(""); setPaginaActual(1); };
  const cambiarSitio = (v: string) => { setSitioId(v); setAreaId(""); setColaboradorId(""); setPaginaActual(1); };
  const cambiarArea = (v: string) => { setAreaId(v); setColaboradorId(""); setPaginaActual(1); };
  const cambiarColaborador = (v: string) => { setColaboradorId(v); setPaginaActual(1); };
  const cambiarBusqueda = (v: string) => { setBusqueda(v); setPaginaActual(1); };

  const aprobadasFiltradas = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return aprobadas.filter((a) => {
      if (empresaId && a.empresaId !== empresaId) return false;
      if (sitioId && a.sitioId !== sitioId) return false;
      if (areaId && a.areaId !== areaId) return false;
      if (colaboradorId && a.colaboradorId !== colaboradorId) return false;
      if (!texto) return true;
      return (
        a.nombreColaborador.toLowerCase().includes(texto) ||
        a.rutaNombre.toLowerCase().includes(texto)
      );
    });
  }, [aprobadas, empresaId, sitioId, areaId, colaboradorId, busqueda]);

  const totalPaginas = Math.max(1, Math.ceil(aprobadasFiltradas.length / POR_PAGINA));
  const aprobadasPagina = useMemo(
    () => aprobadasFiltradas.slice((paginaActual - 1) * POR_PAGINA, paginaActual * POR_PAGINA),
    [aprobadasFiltradas, paginaActual]
  );
  const totalGeneral = useMemo(
    () => aprobadasFiltradas.reduce((acc, a) => acc + a.montoTotal, 0),
    [aprobadasFiltradas]
  );

  const [seleccionadas, setSeleccionadas] = useState<Set<string>>(new Set());
  const todasEnPaginaSeleccionadas =
    aprobadasPagina.length > 0 && aprobadasPagina.every((a) => seleccionadas.has(a.id));

  // Total y cantidad de lo SELECCIONADO (no solo lo filtrado) — lo que
  // de verdad se va a pagar si se aprieta "Pagar seleccionadas"
  const totalSeleccionado = useMemo(
    () => aprobadas.filter((a) => seleccionadas.has(a.id)).reduce((acc, a) => acc + a.montoTotal, 0),
    [aprobadas, seleccionadas]
  );

  const alternarSeleccion = (id: string) => {
    setSeleccionadas((prev) => {
      const copia = new Set(prev);
      copia.has(id) ? copia.delete(id) : copia.add(id);
      return copia;
    });
  };

  const alternarSeleccionarTodo = () => {
    setSeleccionadas((prev) => {
      const copia = new Set(prev);
      if (todasEnPaginaSeleccionadas) {
        aprobadasPagina.forEach((a) => copia.delete(a.id));
      } else {
        aprobadasPagina.forEach((a) => copia.add(a.id));
      }
      return copia;
    });
  };

  const [idAPagar, setIdAPagar] = useState<string | null>(null);
  const [pagando, setPagando] = useState(false);
  const [confirmandoLote, setConfirmandoLote] = useState(false);
  const [pagandoLote, setPagandoLote] = useState(false);
  const [error, setError] = useState("");

  const aprobadaAPagar = aprobadas.find((a) => a.id === idAPagar);

  const confirmarPago = async () => {
    if (!idAPagar) return;
    setPagando(true);
    setError("");
    const res = await fetch(`/api/solicitudes/${idAPagar}/pagar`, { method: "PATCH" });
    setPagando(false);
    setIdAPagar(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "No se pudo marcar como pagada");
      toast.error(data.error ?? "No se pudo marcar como pagada");
      return;
    }
    toast.exito("Solicitud marcada como pagada");
    router.refresh();
  };

  const confirmarPagoLote = async () => {
    setPagandoLote(true);
    setError("");
    const res = await fetch(`/api/solicitudes/pagar-lote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: Array.from(seleccionadas) }),
    });
    setPagandoLote(false);
    setConfirmandoLote(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "No se pudo pagar el lote");
      toast.error(data.error ?? "No se pudo pagar el lote");
      return;
    }
    toast.exito("Solicitudes marcadas como pagadas");
    setSeleccionadas(new Set());
    router.refresh();
  };

  return (
    <div className="flex-1 px-4 sm:px-8 py-5 space-y-4">
      <h1 className="text-lg sm:text-xl font-bold">Pagos Pendientes</h1>
      <p className="text-xs text-orange-400 font-medium">
        Rol: {esSuperAdmin ? "Super Administrador" : "Finanzas"}
      </p>

      {/* Filtros en cascada: Empresa -> Sitio -> Área -> Colaborador */}
      <div className="bg-neutral-50 text-neutral-800 rounded-2xl p-5 shadow-sm ring-1 ring-black/5 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Empresa</label>
            <div className="mt-1.5">
              <ComboboxBuscable opciones={empresasOpciones} value={empresaId} onChange={cambiarEmpresa} placeholder="Todas" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Sitio</label>
            <div className="mt-1.5">
              <ComboboxBuscable opciones={sitiosOpciones} value={sitioId} onChange={cambiarSitio} placeholder="Todos" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Área</label>
            <div className="mt-1.5">
              <ComboboxBuscable opciones={areasOpciones} value={areaId} onChange={cambiarArea} placeholder="Todas" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Colaborador</label>
            <div className="mt-1.5">
              <ComboboxBuscable opciones={colaboradoresOpciones} value={colaboradorId} onChange={cambiarColaborador} placeholder="Todos" />
            </div>
          </div>
        </div>
        <input
          value={busqueda}
          onChange={(e) => cambiarBusqueda(e.target.value)}
          placeholder="Buscar por colaborador o ruta..."
          className="w-full max-w-sm rounded-xl border border-neutral-200 px-4 py-2.5 text-sm focus:border-orange-400 focus:ring-2 focus:ring-orange-500/15 outline-none"
        />
      </div>

      {/* Resumen SIEMPRE visible: cuántas y por cuánto */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3">
          <p className="text-[11px] text-neutral-400 uppercase tracking-wide">Mostrando</p>
          <p className="text-lg font-bold text-white">
            {aprobadasFiltradas.length} {aprobadasFiltradas.length === 1 ? "solicitud" : "solicitudes"} · ${totalGeneral.toFixed(2)}
          </p>
        </div>
        {seleccionadas.size > 0 && (
          <div className="flex-1 bg-orange-500/10 border border-orange-500/30 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] text-orange-400 uppercase tracking-wide">Seleccionadas</p>
              <p className="text-lg font-bold text-orange-300">
                {seleccionadas.size} · ${totalSeleccionado.toFixed(2)}
              </p>
            </div>
            <button
              onClick={() => setConfirmandoLote(true)}
              className="text-xs sm:text-sm font-semibold bg-orange-500 hover:bg-orange-600 text-black px-3 py-2 rounded-lg transition shadow-sm hover:shadow-md shrink-0"
            >
              Pagar seleccionadas
            </button>
          </div>
        )}
      </div>

      <div className="bg-neutral-50 text-neutral-800 rounded-2xl overflow-hidden shadow-sm ring-1 ring-black/5">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead className="bg-neutral-100/70 text-neutral-500 text-left">
              <tr>
                <th className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={todasEnPaginaSeleccionadas}
                    onChange={alternarSeleccionarTodo}
                    className="w-4 h-4 accent-orange-500 rounded"
                  />
                </th>
                <th className="px-4 py-3 font-medium">Fecha del pasaje</th>
                <th className="px-4 py-3 font-medium">Colaborador</th>
                <th className="px-4 py-3 font-medium">Empresa · Sitio · Área</th>
                <th className="px-4 py-3 font-medium">Ruta</th>
                <th className="px-4 py-3 font-medium">Valor</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {aprobadasPagina.map((a) => (
                <tr key={a.id} className="border-t border-neutral-200/70 hover:bg-neutral-100/60 transition">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={seleccionadas.has(a.id)}
                      onChange={() => alternarSeleccion(a.id)}
                      className="w-4 h-4 accent-orange-500 rounded"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{formatearFecha(a.fecha)}</p>
                    {a.fechaAprobacion && (
                      <p className="text-[11px] text-neutral-400">
                        Aprobada: {new Date(a.fechaAprobacion).toLocaleString("es-EC", {
                          day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
                        })}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">{a.nombreColaborador}</td>
                  <td className="px-4 py-3 text-neutral-600">{a.empresaNombre} · {a.sitioNombre} · {a.areaNombre}</td>
                  <td className="px-4 py-3">{a.rutaNombre}</td>
                  <td className="px-4 py-3">${a.montoTotal.toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setIdAPagar(a.id)}
                      className="text-xs font-medium text-white bg-orange-500 hover:bg-orange-600 px-3 py-1.5 rounded-full transition"
                    >
                      Marcar pagada
                    </button>
                  </td>
                </tr>
              ))}
              {aprobadasFiltradas.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-neutral-400">
                    Sin resultados con esos filtros
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Paginacion paginaActual={paginaActual} totalPaginas={totalPaginas} onCambiarPagina={setPaginaActual} />
      </div>

      {idAPagar && aprobadaAPagar && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4">
          <div className="bg-white text-black rounded-3xl p-7 w-full max-w-xs text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center mx-auto text-2xl">$</div>
            <p className="font-semibold text-neutral-900">¿Marcar esta solicitud como pagada?</p>
            <p className="text-sm text-neutral-500">{aprobadaAPagar.nombreColaborador} · ${aprobadaAPagar.montoTotal.toFixed(2)}</p>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-2 justify-center pt-1">
              <button
                onClick={() => setIdAPagar(null)}
                disabled={pagando}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-neutral-600 border border-neutral-200 rounded-xl hover:bg-neutral-100 transition"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarPago}
                disabled={pagando}
                className="flex-1 px-4 py-2.5 text-sm font-semibold bg-orange-500 hover:bg-orange-600 text-white rounded-xl disabled:opacity-50 transition flex items-center justify-center gap-2"
              >
                {pagando && <Spinner className="w-4 h-4" />}
                {pagando ? "Guardando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmandoLote && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4">
          <div className="bg-white text-black rounded-3xl p-7 w-full max-w-xs text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center mx-auto text-2xl">$</div>
            <p className="font-semibold text-neutral-900">¿Marcar {seleccionadas.size} solicitudes como pagadas?</p>
            <p className="text-sm text-neutral-500">Total a pagar: ${totalSeleccionado.toFixed(2)}</p>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-2 justify-center pt-1">
              <button
                onClick={() => setConfirmandoLote(false)}
                disabled={pagandoLote}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-neutral-600 border border-neutral-200 rounded-xl hover:bg-neutral-100 transition"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarPagoLote}
                disabled={pagandoLote}
                className="flex-1 px-4 py-2.5 text-sm font-semibold bg-orange-500 hover:bg-orange-600 text-white rounded-xl disabled:opacity-50 transition flex items-center justify-center gap-2"
              >
                {pagandoLote && <Spinner className="w-4 h-4" />}
                {pagandoLote ? "Guardando..." : "Confirmar todas"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}