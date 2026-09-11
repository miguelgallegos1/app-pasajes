// components/PanelCoordinador.tsx
// Panel de Coordinador: cola de solicitudes APROBADAS dentro de su
// alcance, listas para revisar. Marca "Revisada" (pasa a Nómina) o
// "Discrepancia" (regresa a Aprobada con un motivo). Vista alterna
// agrupada por colaborador, con desglose por ruta.

"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Paginacion from "./Paginacion";
import Modal from "./Modal";
import { formatearFecha } from "../lib/fechas";
import Spinner from "./Spinner";
import { useToast } from "./Toast";
import TablaAgrupadaColaborador, { type FilaResumen } from "./TablaAgrupadaColaborador";

type Aprobada = {
  id: string;
  codigo: string;
  fecha: string;
  fechaAprobacion: string | null;
  montoTotal: number;
  colaboradorId: string;
  nombreColaborador: string;
  rutaId: string;
  rutaLabel: string;
};

const POR_PAGINA = 8;

export default function PanelCoordinador({
  esSuperAdmin,
  sinAsignaciones,
  aprobadas,
}: {
  esSuperAdmin: boolean;
  sinAsignaciones: boolean;
  aprobadas: Aprobada[];
}) {
  const router = useRouter();
  const toast = useToast();

  const [vista, setVista] = useState<"lista" | "colaborador">("lista");
  const [busqueda, setBusqueda] = useState("");
  const [paginaActual, setPaginaActual] = useState(1);

  const aprobadasFiltradas = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    if (!texto) return aprobadas;
    return aprobadas.filter(
      (s) =>
        s.codigo.toLowerCase().includes(texto) ||
        s.nombreColaborador.toLowerCase().includes(texto) ||
        s.rutaLabel.toLowerCase().includes(texto)
    );
  }, [aprobadas, busqueda]);

  const cambiarBusqueda = (v: string) => { setBusqueda(v); setPaginaActual(1); };

  const totalPaginas = Math.max(1, Math.ceil(aprobadasFiltradas.length / POR_PAGINA));
  const aprobadasPagina = useMemo(
    () => aprobadasFiltradas.slice((paginaActual - 1) * POR_PAGINA, paginaActual * POR_PAGINA),
    [aprobadasFiltradas, paginaActual]
  );
  const totalGeneral = useMemo(
    () => aprobadasFiltradas.reduce((acc, s) => acc + s.montoTotal, 0),
    [aprobadasFiltradas]
  );

  const [seleccionadas, setSeleccionadas] = useState<Set<string>>(new Set());
  const todasEnPaginaSeleccionadas =
    aprobadasPagina.length > 0 && aprobadasPagina.every((s) => seleccionadas.has(s.id));
  const totalSeleccionado = useMemo(
    () => aprobadas.filter((s) => seleccionadas.has(s.id)).reduce((acc, s) => acc + s.montoTotal, 0),
    [aprobadas, seleccionadas]
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
      if (todasEnPaginaSeleccionadas) aprobadasPagina.forEach((s) => copia.delete(s.id));
      else aprobadasPagina.forEach((s) => copia.add(s.id));
      return copia;
    });
  };

  // --- Agrupación por colaborador -> ruta (client-side, cola acotada) ---
  const gruposPorColaborador = useMemo(() => {
    const mapa = new Map<string, { nombre: string; porRuta: Map<string, { nombre: string; items: Aprobada[] }> }>();
    for (const r of aprobadasFiltradas) {
      if (!mapa.has(r.colaboradorId)) mapa.set(r.colaboradorId, { nombre: r.nombreColaborador, porRuta: new Map() });
      const grupo = mapa.get(r.colaboradorId)!;
      if (!grupo.porRuta.has(r.rutaId)) grupo.porRuta.set(r.rutaId, { nombre: r.rutaLabel, items: [] });
      grupo.porRuta.get(r.rutaId)!.items.push(r);
    }
    return mapa;
  }, [aprobadasFiltradas]);

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

  const [idARevisar, setIdARevisar] = useState<string | null>(null);
  const [revisando, setRevisando] = useState(false);
  const [confirmandoLote, setConfirmandoLote] = useState(false);
  const [revisandoLote, setRevisandoLote] = useState(false);

  const [idADiscrepancia, setIdADiscrepancia] = useState<string | null>(null);
  const [motivoDiscrepancia, setMotivoDiscrepancia] = useState("");
  const [enviandoDiscrepancia, setEnviandoDiscrepancia] = useState(false);

  const [error, setError] = useState("");

  const confirmarRevisar = async () => {
    if (!idARevisar) return;
    setRevisando(true);
    setError("");
    try {
      const res = await fetch(`/api/solicitudes/${idARevisar}/revisar`, { method: "PATCH" });
      setIdARevisar(null);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "No se pudo revisar");
        toast.error(data.error ?? "No se pudo revisar la solicitud");
        return;
      }
      toast.exito("Solicitud marcada como revisada");
      router.refresh();
    } catch {
      setIdARevisar(null);
      setError("No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.");
      toast.error("No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setRevisando(false);
    }
  };

  const confirmarRevisarLote = async () => {
    setRevisandoLote(true);
    setError("");
    try {
      const res = await fetch(`/api/solicitudes/revisar-lote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(seleccionadas) }),
      });
      setConfirmandoLote(false);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "No se pudo revisar el lote");
        toast.error(data.error ?? "No se pudo revisar el lote");
        return;
      }
      toast.exito("Solicitudes marcadas como revisadas");
      setSeleccionadas(new Set());
      router.refresh();
    } catch {
      setConfirmandoLote(false);
      setError("No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.");
      toast.error("No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setRevisandoLote(false);
    }
  };

  const abrirDiscrepancia = (id: string) => {
    setIdADiscrepancia(id);
    setMotivoDiscrepancia("");
    setError("");
  };

  const confirmarDiscrepancia = async () => {
    if (!idADiscrepancia) return;
    if (motivoDiscrepancia.trim().length < 3) {
      setError("Escribe la discrepancia encontrada (mínimo 3 caracteres)");
      return;
    }
    setEnviandoDiscrepancia(true);
    setError("");
    try {
      const res = await fetch(`/api/solicitudes/${idADiscrepancia}/devolver-revision`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ motivo: motivoDiscrepancia }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "No se pudo devolver la solicitud");
        toast.error(data.error ?? "No se pudo devolver la solicitud");
        return;
      }
      toast.exito("Solicitud devuelta a Aprobada");
      setIdADiscrepancia(null);
      router.refresh();
    } catch {
      setError("No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.");
      toast.error("No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setEnviandoDiscrepancia(false);
    }
  };

  const filaAcciones = (s: Aprobada) => (
    <div className="flex items-center justify-between gap-2 bg-white rounded-lg px-3 py-2 ring-1 ring-black/5 text-sm">
      <div className="min-w-0">
        <p className="font-mono font-bold tracking-widest text-neutral-500 text-xs">{s.codigo}</p>
        <p className="text-neutral-600">{formatearFecha(s.fecha)} · ${s.montoTotal.toFixed(2)}</p>
      </div>
      <div className="flex gap-1.5 shrink-0">
        <button
          onClick={() => setIdARevisar(s.id)}
          className="text-xs font-medium text-white bg-sky-600 hover:bg-sky-700 px-2.5 py-1.5 rounded-full transition"
        >
          Revisar
        </button>
        <button
          onClick={() => abrirDiscrepancia(s.id)}
          className="text-xs font-medium text-white bg-neutral-700 hover:bg-neutral-800 px-2.5 py-1.5 rounded-full transition"
        >
          Discrepancia
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col">
      <div className="flex-1 px-4 sm:px-8 py-5 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-lg sm:text-xl font-bold">Revisión</h1>
          {seleccionadas.size > 0 && (
            <button
              onClick={() => setConfirmandoLote(true)}
              className="text-xs sm:text-sm font-semibold bg-sky-600 hover:bg-sky-700 text-white px-3 py-2 rounded-lg transition shadow-sm hover:shadow-md"
            >
              Revisar seleccionadas ({seleccionadas.size})
            </button>
          )}
        </div>
        <p className="text-xs text-orange-400 font-medium">
          Rol: {esSuperAdmin ? "Super Administrador" : "Coordinador"} · Solicitudes aprobadas listas para revisar
        </p>

        {sinAsignaciones && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-xl px-4 py-3">
            Todavía no tienes ninguna Empresa/Sitio/Área asignada. Pide al Super Administrador que te
            asigne al menos una para poder ver solicitudes.
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <input
            value={busqueda}
            onChange={(e) => cambiarBusqueda(e.target.value)}
            placeholder="Buscar por código, colaborador o ruta..."
            className="w-full sm:max-w-sm rounded-xl border border-neutral-700 bg-neutral-900 text-white px-4 py-2.5 text-sm placeholder-neutral-500 focus:border-orange-400 focus:ring-2 focus:ring-orange-500/15 outline-none"
          />
          <div className="flex bg-neutral-900 border border-neutral-800 rounded-xl p-1 gap-1 self-start">
            {[
              { value: "lista" as const, label: "Lista" },
              { value: "colaborador" as const, label: "Por colaborador" },
            ].map((op) => (
              <button
                key={op.value}
                type="button"
                onClick={() => setVista(op.value)}
                className={`text-xs font-semibold px-3 py-2 rounded-lg transition ${
                  vista === op.value ? "bg-white text-neutral-900" : "text-neutral-400 hover:text-neutral-200"
                }`}
              >
                {op.label}
              </button>
            ))}
          </div>
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
              vacio={busqueda ? "Sin resultados para esa búsqueda" : sinAsignaciones ? "Sin áreas asignadas" : "No hay solicitudes aprobadas pendientes de revisión"}
            />
          </div>
        ) : (
          <div className="bg-neutral-50 text-neutral-800 rounded-2xl overflow-hidden shadow-sm ring-1 ring-black/5">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[680px]">
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
                    <th className="px-4 py-3 font-medium">Fecha</th>
                    <th className="px-4 py-3 font-medium">Colaborador</th>
                    <th className="px-4 py-3 font-medium">Ruta</th>
                    <th className="px-4 py-3 font-medium">Valor</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {aprobadasPagina.map((s) => (
                    <tr key={s.id} className="border-t border-neutral-200/70 hover:bg-neutral-100/60 transition">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={seleccionadas.has(s.id)}
                          onChange={() => alternarSeleccion(s.id)}
                          className="w-4 h-4 accent-orange-500 rounded"
                        />
                      </td>
                      <td className="px-4 py-3 font-mono font-bold tracking-widest text-neutral-500">{s.codigo}</td>
                      <td className="px-4 py-3">{formatearFecha(s.fecha)}</td>
                      <td className="px-4 py-3">{s.nombreColaborador}</td>
                      <td className="px-4 py-3 text-neutral-600">{s.rutaLabel}</td>
                      <td className="px-4 py-3">${s.montoTotal.toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => setIdARevisar(s.id)}
                            className="text-xs font-medium text-white bg-sky-600 hover:bg-sky-700 px-3 py-1.5 rounded-full transition"
                          >
                            Revisar
                          </button>
                          <button
                            onClick={() => abrirDiscrepancia(s.id)}
                            className="text-xs font-medium text-white bg-neutral-700 hover:bg-neutral-800 px-3 py-1.5 rounded-full transition"
                          >
                            Discrepancia
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {aprobadasFiltradas.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-neutral-400">
                        {busqueda
                          ? "Sin resultados para esa búsqueda"
                          : sinAsignaciones
                          ? "Sin áreas asignadas"
                          : "No hay solicitudes aprobadas pendientes de revisión"}
                      </td>
                    </tr>
                  )}
                </tbody>
                {aprobadasFiltradas.length > 0 && (
                  <tfoot>
                    <tr className="border-t border-neutral-200 bg-neutral-100/70 font-semibold">
                      <td className="px-4 py-3" colSpan={4}>
                        Total ({aprobadasFiltradas.length} {aprobadasFiltradas.length === 1 ? "solicitud" : "solicitudes"})
                      </td>
                      <td className="px-4 py-3">${totalGeneral.toFixed(2)}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
            <Paginacion paginaActual={paginaActual} totalPaginas={totalPaginas} onCambiarPagina={setPaginaActual} />
          </div>
        )}
      </div>

      <Modal abierto={!!idARevisar} variante="centro" className="bg-white text-black rounded-3xl p-7 w-full max-w-xs text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center mx-auto text-2xl">✓</div>
            <p className="font-semibold text-neutral-900">¿Marcar esta solicitud como revisada?</p>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-2 justify-center pt-1">
              <button
                onClick={() => setIdARevisar(null)}
                disabled={revisando}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-neutral-600 border border-neutral-200 rounded-xl hover:bg-neutral-100 transition"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarRevisar}
                disabled={revisando}
                className="flex-1 px-4 py-2.5 text-sm font-semibold bg-sky-600 hover:bg-sky-700 text-white rounded-xl disabled:opacity-50 transition flex items-center justify-center gap-2"
              >
                {revisando && <Spinner className="w-4 h-4" />}
                {revisando ? "Guardando..." : "Revisar"}
              </button>
            </div>
      </Modal>

      <Modal abierto={confirmandoLote} variante="centro" className="bg-white text-black rounded-3xl p-7 w-full max-w-xs text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center mx-auto text-2xl">✓</div>
            <p className="font-semibold text-neutral-900">¿Marcar {seleccionadas.size} solicitudes como revisadas?</p>
            <p className="text-sm text-neutral-500">Total: ${totalSeleccionado.toFixed(2)}</p>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-2 justify-center pt-1">
              <button
                onClick={() => setConfirmandoLote(false)}
                disabled={revisandoLote}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-neutral-600 border border-neutral-200 rounded-xl hover:bg-neutral-100 transition"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarRevisarLote}
                disabled={revisandoLote}
                className="flex-1 px-4 py-2.5 text-sm font-semibold bg-sky-600 hover:bg-sky-700 text-white rounded-xl disabled:opacity-50 transition flex items-center justify-center gap-2"
              >
                {revisandoLote && <Spinner className="w-4 h-4" />}
                {revisandoLote ? "Guardando..." : "Revisar todas"}
              </button>
            </div>
      </Modal>

      <Modal abierto={!!idADiscrepancia} variante="centro" className="bg-white text-black rounded-3xl p-7 w-full max-w-sm space-y-4 shadow-2xl">
            <div>
              <h2 className="font-semibold text-neutral-900">Reportar discrepancia</h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                La solicitud vuelve a Aprobada para que TH la corrija.
              </p>
            </div>
            <textarea
              value={motivoDiscrepancia}
              onChange={(e) => setMotivoDiscrepancia(e.target.value.toUpperCase())}
              rows={3}
              autoFocus
              className="w-full rounded-xl border border-neutral-200 px-3.5 py-3 text-sm focus:border-orange-400 focus:ring-2 focus:ring-orange-500/15 outline-none resize-none"
              placeholder="Ej: La ruta no corresponde al área del colaborador..."
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-2 justify-end pt-1">
              <button
                onClick={() => setIdADiscrepancia(null)}
                disabled={enviandoDiscrepancia}
                className="px-4 py-2.5 text-sm font-medium text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100 rounded-xl transition"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarDiscrepancia}
                disabled={enviandoDiscrepancia}
                className="px-5 py-2.5 text-sm font-semibold bg-neutral-800 hover:bg-neutral-900 text-white rounded-xl disabled:opacity-50 transition flex items-center justify-center gap-2"
              >
                {enviandoDiscrepancia && <Spinner className="w-4 h-4" />}
                {enviandoDiscrepancia ? "Enviando..." : "Devolver"}
              </button>
            </div>
      </Modal>
    </div>
  );
}
