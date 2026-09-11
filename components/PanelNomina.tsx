// components/PanelNomina.tsx
// Panel de Nómina (antes Finanzas): cola de solicitudes REVISADAS listas
// para pagar. Filtros en cascada Empresa -> Sitio -> Área -> Colaborador,
// selección múltiple, y una vista alterna agrupada por colaborador (con
// desglose por ruta) para controlar mejor los montos antes de pagar.

"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import ComboboxBuscable from "./ComboboxBuscable";
import Paginacion from "./Paginacion";
import Modal from "./Modal";
import { formatearFecha } from "../lib/fechas";
import Spinner from "./Spinner";
import { useToast } from "./Toast";
import TablaAgrupadaColaborador, { type FilaResumen } from "./TablaAgrupadaColaborador";

type Revisada = {
  id: string;
  codigo: string;
  fecha: string;
  fechaRevision: string | null;
  montoTotal: number;
  colaboradorId: string;
  nombreColaborador: string;
  empresaId: string;
  empresaNombre: string;
  sitioId: string;
  sitioNombre: string;
  areaId: string;
  areaNombre: string;
  rutaId: string;
  rutaNombre: string;
};

const POR_PAGINA = 8;

function opcionesUnicas<T>(items: T[], idKey: keyof T, labelKey: keyof T) {
  const vistos = new Map<string, string>();
  for (const item of items) {
    const id = String(item[idKey]);
    if (!vistos.has(id)) vistos.set(id, String(item[labelKey]));
  }
  return Array.from(vistos.entries()).map(([id, label]) => ({ id, label }));
}

export default function PanelNomina({
  esSuperAdmin,
  revisadas,
}: {
  esSuperAdmin: boolean;
  revisadas: Revisada[];
}) {
  const router = useRouter();
  const toast = useToast();

  const [vista, setVista] = useState<"lista" | "colaborador">("lista");
  const [busqueda, setBusqueda] = useState("");
  const [empresaId, setEmpresaId] = useState("");
  const [sitioId, setSitioId] = useState("");
  const [areaId, setAreaId] = useState("");
  const [colaboradorId, setColaboradorId] = useState("");
  const [paginaActual, setPaginaActual] = useState(1);

  const empresasOpciones = useMemo(() => opcionesUnicas(revisadas, "empresaId", "empresaNombre"), [revisadas]);
  const sitiosBase = useMemo(
    () => (empresaId ? revisadas.filter((a) => a.empresaId === empresaId) : revisadas),
    [revisadas, empresaId]
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

  const revisadasFiltradas = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return revisadas.filter((a) => {
      if (empresaId && a.empresaId !== empresaId) return false;
      if (sitioId && a.sitioId !== sitioId) return false;
      if (areaId && a.areaId !== areaId) return false;
      if (colaboradorId && a.colaboradorId !== colaboradorId) return false;
      if (!texto) return true;
      return (
        a.codigo.toLowerCase().includes(texto) ||
        a.nombreColaborador.toLowerCase().includes(texto) ||
        a.rutaNombre.toLowerCase().includes(texto)
      );
    });
  }, [revisadas, empresaId, sitioId, areaId, colaboradorId, busqueda]);

  const totalPaginas = Math.max(1, Math.ceil(revisadasFiltradas.length / POR_PAGINA));
  const revisadasPagina = useMemo(
    () => revisadasFiltradas.slice((paginaActual - 1) * POR_PAGINA, paginaActual * POR_PAGINA),
    [revisadasFiltradas, paginaActual]
  );
  const totalGeneral = useMemo(
    () => revisadasFiltradas.reduce((acc, a) => acc + a.montoTotal, 0),
    [revisadasFiltradas]
  );

  const [seleccionadas, setSeleccionadas] = useState<Set<string>>(new Set());
  const todasEnPaginaSeleccionadas =
    revisadasPagina.length > 0 && revisadasPagina.every((a) => seleccionadas.has(a.id));

  const totalSeleccionado = useMemo(
    () => revisadas.filter((a) => seleccionadas.has(a.id)).reduce((acc, a) => acc + a.montoTotal, 0),
    [revisadas, seleccionadas]
  );

  const alternarSeleccion = (id: string) => {
    setSeleccionadas((prev) => {
      const copia = new Set(prev);
      if (copia.has(id)) copia.delete(id);
      else copia.add(id);
      return copia;
    });
  };

  const alternarSeleccionarTodo = () => {
    setSeleccionadas((prev) => {
      const copia = new Set(prev);
      if (todasEnPaginaSeleccionadas) revisadasPagina.forEach((a) => copia.delete(a.id));
      else revisadasPagina.forEach((a) => copia.add(a.id));
      return copia;
    });
  };

  // --- Agrupación por colaborador -> ruta (client-side: la cola de
  // acción es un conjunto acotado, ya está completa en memoria) ---
  const gruposPorColaborador = useMemo(() => {
    const mapa = new Map<string, { nombre: string; porRuta: Map<string, { nombre: string; items: Revisada[] }> }>();
    for (const r of revisadasFiltradas) {
      if (!mapa.has(r.colaboradorId)) mapa.set(r.colaboradorId, { nombre: r.nombreColaborador, porRuta: new Map() });
      const grupo = mapa.get(r.colaboradorId)!;
      if (!grupo.porRuta.has(r.rutaId)) grupo.porRuta.set(r.rutaId, { nombre: r.rutaNombre, items: [] });
      grupo.porRuta.get(r.rutaId)!.items.push(r);
    }
    return mapa;
  }, [revisadasFiltradas]);

  const filasColaborador: FilaResumen[] = useMemo(
    () =>
      Array.from(gruposPorColaborador.entries())
        .map(([id, g]) => ({
          id,
          nombre: g.nombre,
          cantidad: g.porRuta.size,
          total: Array.from(g.porRuta.values()).reduce((acc, r) => acc + r.items.reduce((a, i) => a + i.montoTotal, 0), 0),
        }))
        .sort((a, b) => a.nombre.localeCompare(b.nombre)),
    [gruposPorColaborador]
  );

  const [idAPagar, setIdAPagar] = useState<string | null>(null);
  const [pagando, setPagando] = useState(false);
  const [confirmandoLote, setConfirmandoLote] = useState(false);
  const [pagandoLote, setPagandoLote] = useState(false);
  const [idANovedad, setIdANovedad] = useState<string | null>(null);
  const [motivoNovedad, setMotivoNovedad] = useState("");
  const [enviandoNovedad, setEnviandoNovedad] = useState(false);
  const [error, setError] = useState("");

  const revisadaAPagar = revisadas.find((a) => a.id === idAPagar);

  const confirmarPago = async () => {
    if (!idAPagar) return;
    setPagando(true);
    setError("");
    try {
      const res = await fetch(`/api/solicitudes/${idAPagar}/pagar`, { method: "PATCH" });
      setIdAPagar(null);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "No se pudo marcar como pagada");
        toast.error(data.error ?? "No se pudo marcar como pagada");
        return;
      }
      toast.exito("Solicitud marcada como pagada");
      router.refresh();
    } catch {
      setIdAPagar(null);
      setError("No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.");
      toast.error("No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setPagando(false);
    }
  };

  const confirmarPagoLote = async () => {
    setPagandoLote(true);
    setError("");
    try {
      const res = await fetch(`/api/solicitudes/pagar-lote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(seleccionadas) }),
      });
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
    } catch {
      setConfirmandoLote(false);
      setError("No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.");
      toast.error("No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setPagandoLote(false);
    }
  };

  const abrirNovedad = (id: string) => {
    setIdANovedad(id);
    setMotivoNovedad("");
    setError("");
  };

  const confirmarNovedad = async () => {
    if (!idANovedad) return;
    if (motivoNovedad.trim().length < 3) {
      setError("Escribe la novedad encontrada (mínimo 3 caracteres)");
      return;
    }
    setEnviandoNovedad(true);
    setError("");
    try {
      const res = await fetch(`/api/solicitudes/${idANovedad}/devolver-revision`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ motivo: motivoNovedad }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "No se pudo devolver la solicitud");
        toast.error(data.error ?? "No se pudo devolver la solicitud");
        return;
      }
      toast.exito("Solicitud devuelta a Aprobada");
      setIdANovedad(null);
      router.refresh();
    } catch {
      setError("No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.");
      toast.error("No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setEnviandoNovedad(false);
    }
  };

  const filaAcciones = (a: Revisada) => (
    <div className="flex items-center justify-between gap-2 bg-white rounded-lg px-3 py-2 ring-1 ring-black/5 text-sm">
      <div className="min-w-0">
        <p className="font-mono font-bold tracking-widest text-neutral-500 text-xs">{a.codigo}</p>
        <p className="text-neutral-600">{formatearFecha(a.fecha)} · ${a.montoTotal.toFixed(2)}</p>
      </div>
      <div className="flex gap-1.5 shrink-0">
        <button
          onClick={() => setIdAPagar(a.id)}
          className="text-xs font-medium text-white bg-orange-500 hover:bg-orange-600 px-2.5 py-1.5 rounded-full transition"
        >
          Pagar
        </button>
        <button
          onClick={() => abrirNovedad(a.id)}
          className="text-xs font-medium text-white bg-neutral-700 hover:bg-neutral-800 px-2.5 py-1.5 rounded-full transition"
        >
          Novedad
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex-1 px-4 sm:px-8 py-5 space-y-4">
      <h1 className="text-lg sm:text-xl font-bold">Pagos Pendientes</h1>
      <p className="text-xs text-orange-400 font-medium">
        Rol: {esSuperAdmin ? "Super Administrador" : "Nómina"} · Solicitudes revisadas listas para pagar
      </p>

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
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <input
            value={busqueda}
            onChange={(e) => cambiarBusqueda(e.target.value)}
            placeholder="Buscar por código, colaborador o ruta..."
            className="w-full max-w-sm rounded-xl border border-neutral-200 px-4 py-2.5 text-sm focus:border-orange-400 focus:ring-2 focus:ring-orange-500/15 outline-none"
          />
          <div className="flex bg-neutral-100 rounded-xl p-1 gap-1 self-start">
            {[
              { value: "lista" as const, label: "Lista" },
              { value: "colaborador" as const, label: "Por colaborador" },
            ].map((op) => (
              <button
                key={op.value}
                type="button"
                onClick={() => setVista(op.value)}
                className={`text-xs font-semibold px-3 py-2 rounded-lg transition ${
                  vista === op.value ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500 hover:text-neutral-700"
                }`}
              >
                {op.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3">
          <p className="text-[11px] text-neutral-400 uppercase tracking-wide">Mostrando</p>
          <p className="text-lg font-bold text-white">
            {revisadasFiltradas.length} {revisadasFiltradas.length === 1 ? "solicitud" : "solicitudes"} · ${totalGeneral.toFixed(2)}
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

      {vista === "colaborador" ? (
        <div className="bg-neutral-50 text-neutral-800 rounded-2xl overflow-hidden shadow-sm ring-1 ring-black/5">
          <TablaAgrupadaColaborador
            filas={filasColaborador}
            cargarSubfilas={(colaboradorId) => {
              const g = gruposPorColaborador.get(colaboradorId);
              if (!g) return [];
              return Array.from(g.porRuta.entries()).map(([id, r]) => ({
                id,
                nombre: r.nombre,
                cantidad: r.items.length,
                total: r.items.reduce((a, i) => a + i.montoTotal, 0),
              }));
            }}
            cargarDetalle={(colaboradorId, rutaId) => gruposPorColaborador.get(colaboradorId)?.porRuta.get(rutaId)?.items ?? []}
            renderDetalle={filaAcciones}
          />
        </div>
      ) : (
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
                  <th className="px-4 py-3 font-medium">Código</th>
                  <th className="px-4 py-3 font-medium">Fecha del pasaje</th>
                  <th className="px-4 py-3 font-medium">Colaborador</th>
                  <th className="px-4 py-3 font-medium">Empresa · Sitio · Área</th>
                  <th className="px-4 py-3 font-medium">Ruta</th>
                  <th className="px-4 py-3 font-medium">Valor</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {revisadasPagina.map((a) => (
                  <tr key={a.id} className="border-t border-neutral-200/70 hover:bg-neutral-100/60 transition">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={seleccionadas.has(a.id)}
                        onChange={() => alternarSeleccion(a.id)}
                        className="w-4 h-4 accent-orange-500 rounded"
                      />
                    </td>
                    <td className="px-4 py-3 font-mono font-bold tracking-widest text-neutral-500">{a.codigo}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{formatearFecha(a.fecha)}</p>
                      {a.fechaRevision && (
                        <p className="text-[11px] text-neutral-400">
                          Revisada: {new Date(a.fechaRevision).toLocaleString("es-EC", {
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
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => setIdAPagar(a.id)}
                          className="text-xs font-medium text-white bg-orange-500 hover:bg-orange-600 px-3 py-1.5 rounded-full transition"
                        >
                          Pagar
                        </button>
                        <button
                          onClick={() => abrirNovedad(a.id)}
                          className="text-xs font-medium text-white bg-neutral-700 hover:bg-neutral-800 px-3 py-1.5 rounded-full transition"
                        >
                          Novedad
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {revisadasFiltradas.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-neutral-400">
                      Sin resultados con esos filtros
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <Paginacion paginaActual={paginaActual} totalPaginas={totalPaginas} onCambiarPagina={setPaginaActual} />
        </div>
      )}

      <Modal abierto={!!idAPagar} variante="centro" className="bg-white text-black rounded-3xl p-7 w-full max-w-xs text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center mx-auto text-2xl">$</div>
            <p className="font-semibold text-neutral-900">¿Marcar esta solicitud como pagada?</p>
            <p className="text-sm text-neutral-500">{revisadaAPagar?.nombreColaborador} · ${revisadaAPagar?.montoTotal.toFixed(2)}</p>
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
      </Modal>

      <Modal abierto={confirmandoLote} variante="centro" className="bg-white text-black rounded-3xl p-7 w-full max-w-xs text-center space-y-4 shadow-2xl">
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
      </Modal>

      <Modal abierto={!!idANovedad} variante="centro" className="bg-white text-black rounded-3xl p-7 w-full max-w-sm space-y-4 shadow-2xl">
            <div>
              <h2 className="font-semibold text-neutral-900">Reportar novedad</h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                La solicitud vuelve a Aprobada para que Coordinación la revise de nuevo
              </p>
            </div>
            <textarea
              value={motivoNovedad}
              onChange={(e) => setMotivoNovedad(e.target.value.toUpperCase())}
              rows={3}
              autoFocus
              className="w-full rounded-xl border border-neutral-200 px-3.5 py-3 text-sm focus:border-orange-400 focus:ring-2 focus:ring-orange-500/15 outline-none resize-none"
              placeholder="Ej: El monto no coincide con la ruta registrada..."
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-2 justify-end pt-1">
              <button
                onClick={() => setIdANovedad(null)}
                disabled={enviandoNovedad}
                className="px-4 py-2.5 text-sm font-medium text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100 rounded-xl transition"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarNovedad}
                disabled={enviandoNovedad}
                className="px-5 py-2.5 text-sm font-semibold bg-neutral-800 hover:bg-neutral-900 text-white rounded-xl disabled:opacity-50 transition flex items-center justify-center gap-2"
              >
                {enviandoNovedad && <Spinner className="w-4 h-4" />}
                {enviandoNovedad ? "Enviando..." : "Devolver"}
              </button>
            </div>
      </Modal>
    </div>
  );
}
