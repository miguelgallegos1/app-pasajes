// components/PanelNomina.tsx
// Panel de Nómina (antes Finanzas): cola de solicitudes REVISADAS listas
// para pagar. Filtros en cascada Empresa -> Sitio -> Área -> Colaborador,
// selección múltiple, y una vista alterna agrupada por colaborador (con
// desglose por ruta) para controlar mejor los montos antes de pagar.

"use client";

import { useState, useMemo, useEffect } from "react";
import { formatearMoneda } from "../lib/formato";
import { IconoDinero, IconoLupa, IconoDevolver } from "./Icons";
import EstadoVacio from "./EstadoVacio";
import Avatar from "./Avatar";
import SelectorVista from "./SelectorVista";
import ComboboxBuscable from "./ComboboxBuscable";
import Paginacion from "./Paginacion";
import Modal from "./Modal";
import { formatearFecha } from "../lib/fechas";
import Spinner from "./Spinner";
import { useToast } from "./Toast";
import TablaColaboradores, { type FilaColaborador } from "./TablaColaboradores";
import EncabezadoOrdenable from "./EncabezadoOrdenable";
import { useOrdenTabla } from "../lib/useOrdenTabla";
import { useNavegacionFilas } from "../lib/useNavegacionFilas";
import { avisarCambioPendientes } from "../lib/avisoPendientes";

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

type CampoOrden = "codigo" | "fecha" | "nombreColaborador" | "rutaNombre" | "montoTotal";
const VALOR_ORDEN: Record<CampoOrden, (r: Revisada) => string | number> = {
  codigo: (r) => r.codigo,
  fecha: (r) => r.fecha,
  nombreColaborador: (r) => r.nombreColaborador,
  rutaNombre: (r) => r.rutaNombre,
  montoTotal: (r) => r.montoTotal,
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

export default function PanelNomina() {
  const toast = useToast();

  // Copia local editable: al pagar/devolver se quita la fila al instante,
  // sin esperar un router.refresh() ni volver a pedir la lista al servidor.
  const [revisadas, setRevisadas] = useState<Revisada[]>([]);
  const [cargandoInicial, setCargandoInicial] = useState(true);
  const [errorInicial, setErrorInicial] = useState("");

  useEffect(() => {
    let cancelado = false;
    fetch("/api/nomina/pagos/revisadas")
      .then(async (res) => {
        if (cancelado) return;
        if (!res.ok) {
          setErrorInicial("No se pudo cargar la información. Intenta de nuevo.");
          return;
        }
        const data = await res.json();
        setRevisadas(data.revisadas);
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

  const { orden, ordenar, itemsOrdenados: revisadasOrdenadas } = useOrdenTabla<Revisada, CampoOrden>(
    revisadasFiltradas,
    (r, campo) => VALOR_ORDEN[campo](r),
    "nomina-pagos"
  );

  const totalPaginas = Math.max(1, Math.ceil(revisadasFiltradas.length / POR_PAGINA));
  const revisadasPagina = useMemo(
    () => revisadasOrdenadas.slice((paginaActual - 1) * POR_PAGINA, paginaActual * POR_PAGINA),
    [revisadasOrdenadas, paginaActual]
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

  // Selección en grupo desde la vista "Por colaborador": si ya están
  // todas seleccionadas las quita, si no las agrega todas — así se puede
  // marcar un colaborador entero (o "Seleccionar todos") sin expandirlo.
  const alternarGrupoSeleccion = (ids: string[]) => {
    setSeleccionadas((prev) => {
      const copia = new Set(prev);
      const todas = ids.every((id) => copia.has(id));
      ids.forEach((id) => (todas ? copia.delete(id) : copia.add(id)));
      return copia;
    });
  };

  // --- Agrupación por colaborador (client-side: la cola de acción es un
  // conjunto acotado, ya está completa en memoria) ---
  const gruposPorColaborador = useMemo(() => {
    const mapa = new Map<string, { nombre: string; items: Revisada[] }>();
    for (const r of revisadasFiltradas) {
      if (!mapa.has(r.colaboradorId)) mapa.set(r.colaboradorId, { nombre: r.nombreColaborador, items: [] });
      mapa.get(r.colaboradorId)!.items.push(r);
    }
    return mapa;
  }, [revisadasFiltradas]);

  const filasColaborador: FilaColaborador[] = useMemo(
    () =>
      Array.from(gruposPorColaborador.entries())
        .map(([id, g]) => ({
          id,
          nombre: g.nombre,
          cantidad: g.items.length,
          total: g.items.reduce((acc, i) => acc + i.montoTotal, 0),
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

  const [confirmandoLoteNovedad, setConfirmandoLoteNovedad] = useState(false);
  const [motivoLoteNovedad, setMotivoLoteNovedad] = useState("");
  const [enviandoLoteNovedad, setEnviandoLoteNovedad] = useState(false);

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
      avisarCambioPendientes();
      setRevisadas((prev) => prev.filter((a) => a.id !== idAPagar));
      // Si esta fila también estaba tildada para el lote, se saca — si no,
      // el contador de "Pagar (N)"/"Novedad (N)" queda contando una fila
      // que ya no existe.
      setSeleccionadas((prev) => {
        if (!prev.has(idAPagar)) return prev;
        const siguiente = new Set(prev);
        siguiente.delete(idAPagar);
        return siguiente;
      });
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
      avisarCambioPendientes();
      const idsPagados = new Set(seleccionadas);
      setRevisadas((prev) => prev.filter((a) => !idsPagados.has(a.id)));
      setSeleccionadas(new Set());
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
      avisarCambioPendientes();
      setRevisadas((prev) => prev.filter((a) => a.id !== idANovedad));
      setSeleccionadas((prev) => {
        if (!prev.has(idANovedad)) return prev;
        const siguiente = new Set(prev);
        siguiente.delete(idANovedad);
        return siguiente;
      });
      setIdANovedad(null);
    } catch {
      setError("No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.");
      toast.error("No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setEnviandoNovedad(false);
    }
  };

  const confirmarNovedadLote = async () => {
    if (motivoLoteNovedad.trim().length < 3) {
      setError("Escribe la novedad encontrada (mínimo 3 caracteres)");
      return;
    }
    setEnviandoLoteNovedad(true);
    setError("");
    try {
      const res = await fetch(`/api/solicitudes/devolver-revision-lote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(seleccionadas), motivo: motivoLoteNovedad }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "No se pudo devolver el lote");
        toast.error(data.error ?? "No se pudo devolver el lote");
        return;
      }
      toast.exito("Solicitudes devueltas a Aprobada");
      avisarCambioPendientes();
      const idsDevueltos = new Set(seleccionadas);
      setRevisadas((prev) => prev.filter((a) => !idsDevueltos.has(a.id)));
      setSeleccionadas(new Set());
      setConfirmandoLoteNovedad(false);
    } catch {
      setError("No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.");
      toast.error("No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setEnviandoLoteNovedad(false);
    }
  };

  const { filaActiva, setFilaActiva, alPresionar, contenedorRef } = useNavegacionFilas(revisadasPagina, (r) =>
    setIdAPagar(r.id)
  );

  return (
    <div className="flex-1 px-4 sm:px-8 pb-5 space-y-4">

      {errorInicial && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{errorInicial}</div>
      )}

      {cargandoInicial ? (
        <div className="flex items-center justify-center gap-2.5 py-24 text-sm text-neutral-400 dark:text-neutral-500">
          <Spinner className="w-4 h-4" /> Cargando...
        </div>
      ) : (
      <>
      <div className="bg-neutral-50 dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 rounded-2xl p-5 shadow-sm ring-1 ring-black/5 dark:ring-white/10 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Empresa</label>
            <div className="mt-1.5">
              <ComboboxBuscable opciones={empresasOpciones} value={empresaId} onChange={cambiarEmpresa} placeholder="Todas" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Sitio</label>
            <div className="mt-1.5">
              <ComboboxBuscable opciones={sitiosOpciones} value={sitioId} onChange={cambiarSitio} placeholder="Todos" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Área</label>
            <div className="mt-1.5">
              <ComboboxBuscable opciones={areasOpciones} value={areaId} onChange={cambiarArea} placeholder="Todas" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Colaborador</label>
            <div className="mt-1.5">
              <ComboboxBuscable opciones={colaboradoresOpciones} value={colaboradorId} onChange={cambiarColaborador} placeholder="Todos" />
            </div>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div className="relative w-full max-w-sm">
            <IconoLupa className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 dark:text-neutral-500 pointer-events-none" />
            <input
              value={busqueda}
              onChange={(e) => cambiarBusqueda(e.target.value)}
              placeholder="Buscar por código, colaborador o ruta..."
              className="w-full rounded-xl border border-neutral-300 bg-white text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white pl-10 pr-4 py-2.5 text-sm placeholder-neutral-500 focus:border-orange-400 focus:ring-2 focus:ring-orange-500/15 outline-none"
            />
          </div>
          <SelectorVista valor={vista} onCambiar={setVista} className="self-start" />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 bg-white border border-neutral-200 dark:bg-neutral-900 dark:border-neutral-800 rounded-xl px-4 py-3">
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">Mostrando</p>
          <p className="text-lg font-bold text-neutral-900 dark:text-white">
            {revisadasFiltradas.length} {revisadasFiltradas.length === 1 ? "solicitud" : "solicitudes"} · {formatearMoneda(totalGeneral)}
          </p>
        </div>
        {seleccionadas.size > 0 && (
          <div className="flex-1 bg-orange-500/10 border border-orange-500/30 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] text-orange-600 dark:text-orange-400 uppercase tracking-wide">Seleccionadas</p>
              <p className="text-lg font-bold text-orange-700 dark:text-orange-300">
                {seleccionadas.size} · {formatearMoneda(totalSeleccionado)}
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => setConfirmandoLoteNovedad(true)}
                title="Reportar novedad"
                className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs sm:text-sm font-medium text-neutral-500 dark:text-neutral-400 border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-700 dark:hover:text-neutral-200 px-3 py-2 rounded-lg transition"
              >
                <IconoDevolver className="w-4 h-4 shrink-0" /> Novedad ({seleccionadas.size})
              </button>
              <button
                onClick={() => setConfirmandoLote(true)}
                className="whitespace-nowrap text-xs sm:text-sm font-semibold bg-orange-500 hover:bg-orange-600 text-black px-3 py-2 rounded-lg transition shadow-sm hover:shadow-md"
              >
                Pagar ({seleccionadas.size})
              </button>
            </div>
          </div>
        )}
      </div>

      {vista === "colaborador" ? (
        <div className="bg-neutral-50 dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 rounded-2xl overflow-hidden shadow-sm ring-1 ring-black/5 dark:ring-white/10">
        <TablaColaboradores
          filas={filasColaborador}
          cargarItems={(colaboradorId) => gruposPorColaborador.get(colaboradorId)?.items ?? []}
          clave={(a) => a.id}
          porPagina={POR_PAGINA}
          claveOrden="nomina-pagos-colaborador"
          seleccion={{
            seleccionadas,
            alternar: alternarSeleccion,
            idsDe: (colaboradorId) => (gruposPorColaborador.get(colaboradorId)?.items ?? []).map((a) => a.id),
            alternarGrupo: alternarGrupoSeleccion,
          }}
          columnas={[
            { encabezado: "Código", render: (a) => <span className="font-mono">{a.codigo}</span> },
            { encabezado: "Fecha", render: (a) => formatearFecha(a.fecha) },
            { encabezado: "Ruta", render: (a) => a.rutaNombre },
            { encabezado: "Valor", render: (a) => formatearMoneda(a.montoTotal) },
          ]}
          acciones={(a) => (
            <div className="flex gap-1.5">
              <button
                onClick={() => setIdAPagar(a.id)}
                className="text-xs font-medium text-white bg-orange-500 hover:bg-orange-600 px-3 py-1.5 rounded-full transition"
              >
                Pagar
              </button>
              <button
                onClick={() => abrirNovedad(a.id)}
                title="Reportar novedad"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-500 dark:text-neutral-400 border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-700 dark:hover:text-neutral-200 px-2.5 py-1.5 rounded-lg transition"
              >
                <IconoDevolver className="w-3.5 h-3.5" /> Novedad
              </button>
            </div>
          )}
          vacio="Sin resultados con esos filtros"
        />
        </div>
      ) : (
        <div className="bg-neutral-50 dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 rounded-2xl overflow-hidden shadow-sm ring-1 ring-black/5 dark:ring-white/10">
          <div
            ref={contenedorRef}
            tabIndex={0}
            onKeyDown={alPresionar}
            className="overflow-x-auto outline-none"
          >
            <table className="w-full text-xs min-w-[720px]">
              <thead className="bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 text-left">
                <tr>
                  <th className="px-4 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={todasEnPaginaSeleccionadas}
                      onChange={alternarSeleccionarTodo}
                      className="w-4 h-4 accent-orange-500 rounded"
                    />
                  </th>
                  <EncabezadoOrdenable campo="codigo" ordenActivo={orden} onOrdenar={ordenar}>Código</EncabezadoOrdenable>
                  <EncabezadoOrdenable campo="fecha" ordenActivo={orden} onOrdenar={ordenar}>Fecha del pasaje</EncabezadoOrdenable>
                  <EncabezadoOrdenable campo="nombreColaborador" ordenActivo={orden} onOrdenar={ordenar}>Colaborador</EncabezadoOrdenable>
                  <th className="px-4 py-3 font-medium">Empresa · Sitio · Área</th>
                  <EncabezadoOrdenable campo="rutaNombre" ordenActivo={orden} onOrdenar={ordenar}>Ruta</EncabezadoOrdenable>
                  <EncabezadoOrdenable campo="montoTotal" ordenActivo={orden} onOrdenar={ordenar}>Valor</EncabezadoOrdenable>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {revisadasPagina.map((a, i) => (
                  <tr
                    key={a.id}
                    onClick={() => setFilaActiva(i)}
                    className={`border-t border-neutral-200/70 dark:border-neutral-800/70 hover:bg-neutral-100/60 dark:hover:bg-neutral-800/60 transition ${
                      i === filaActiva ? "bg-orange-50 dark:bg-orange-500/10" : ""
                    }`}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={seleccionadas.has(a.id)}
                        onChange={() => alternarSeleccion(a.id)}
                        className="w-4 h-4 accent-orange-500 rounded"
                      />
                    </td>
                    <td className="px-4 py-3 font-mono font-bold tracking-widest text-neutral-500 dark:text-neutral-400">{a.codigo}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{formatearFecha(a.fecha)}</p>
                      {a.fechaRevision && (
                        <p className="text-[11px] text-neutral-400 dark:text-neutral-500">
                          Revisada: {new Date(a.fechaRevision).toLocaleString("es-EC", {
                            day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
                          })}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar nombre={a.nombreColaborador} indice={i} className="w-7 h-7 text-[11px]" />
                        <span>{a.nombreColaborador}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-neutral-600">{a.empresaNombre} · {a.sitioNombre} · {a.areaNombre}</td>
                    <td className="px-4 py-3">{a.rutaNombre}</td>
                    <td className="px-4 py-3">{formatearMoneda(a.montoTotal)}</td>
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
                          title="Reportar novedad"
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-500 dark:text-neutral-400 border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-700 dark:hover:text-neutral-200 px-2.5 py-1.5 rounded-lg transition"
                        >
                          <IconoDevolver className="w-3.5 h-3.5" /> Novedad
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {revisadasFiltradas.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-10">
                      <EstadoVacio mensaje="Sin resultados con esos filtros" />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <Paginacion paginaActual={paginaActual} totalPaginas={totalPaginas} onCambiarPagina={setPaginaActual} />
        </div>
      )}
      </>
      )}

      <Modal abierto={!!idAPagar} onCerrar={() => setIdAPagar(null)} onConfirmar={confirmarPago} variante="centro" className="bg-white dark:bg-neutral-900 text-black dark:text-white rounded-3xl p-7 w-full max-w-xs text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center mx-auto"><IconoDinero className="w-6 h-6" /></div>
            <p className="font-semibold text-neutral-900 dark:text-white">¿Marcar esta solicitud como pagada?</p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">{revisadaAPagar?.nombreColaborador} · {formatearMoneda(revisadaAPagar?.montoTotal ?? 0)}</p>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-2 justify-center pt-1">
              <button
                onClick={() => setIdAPagar(null)}
                disabled={pagando}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
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

      <Modal abierto={confirmandoLote} onCerrar={() => setConfirmandoLote(false)} onConfirmar={confirmarPagoLote} variante="centro" className="bg-white dark:bg-neutral-900 text-black dark:text-white rounded-3xl p-7 w-full max-w-xs text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center mx-auto"><IconoDinero className="w-6 h-6" /></div>
            <p className="font-semibold text-neutral-900 dark:text-white">¿Marcar {seleccionadas.size} solicitudes como pagadas?</p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Total a pagar: {formatearMoneda(totalSeleccionado)}</p>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-2 justify-center pt-1">
              <button
                onClick={() => setConfirmandoLote(false)}
                disabled={pagandoLote}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
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

      <Modal abierto={confirmandoLoteNovedad} onCerrar={() => setConfirmandoLoteNovedad(false)} onConfirmar={confirmarNovedadLote} variante="centro" className="bg-white dark:bg-neutral-900 text-black dark:text-white rounded-3xl p-7 w-full max-w-sm space-y-4 shadow-2xl">
            <div>
              <h2 className="font-semibold text-neutral-900 dark:text-white">Novedad en {seleccionadas.size} solicitudes</h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                Todas vuelven a Aprobada para que Coordinación las revise de nuevo.
              </p>
            </div>
            <textarea
              value={motivoLoteNovedad}
              onChange={(e) => setMotivoLoteNovedad(e.target.value.toUpperCase())}
              rows={3}
              autoFocus
              className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white px-3.5 py-3 text-sm focus:border-orange-400 focus:ring-2 focus:ring-orange-500/15 outline-none resize-none"
              placeholder="Ej: El monto no coincide con la ruta registrada..."
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-2 justify-end pt-1">
              <button
                onClick={() => setConfirmandoLoteNovedad(false)}
                disabled={enviandoLoteNovedad}
                className="px-4 py-2.5 text-sm font-medium text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarNovedadLote}
                disabled={enviandoLoteNovedad}
                className="px-5 py-2.5 text-sm font-semibold bg-neutral-800 hover:bg-neutral-900 text-white rounded-xl disabled:opacity-50 transition flex items-center justify-center gap-2"
              >
                {enviandoLoteNovedad && <Spinner className="w-4 h-4" />}
                {enviandoLoteNovedad ? "Enviando..." : "Devolver todas"}
              </button>
            </div>
      </Modal>

      <Modal abierto={!!idANovedad} onCerrar={() => setIdANovedad(null)} onConfirmar={confirmarNovedad} variante="centro" className="bg-white dark:bg-neutral-900 text-black dark:text-white rounded-3xl p-7 w-full max-w-sm space-y-4 shadow-2xl">
            <div>
              <h2 className="font-semibold text-neutral-900 dark:text-white">Reportar novedad</h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                La solicitud vuelve a Aprobada para que Coordinación la revise de nuevo
              </p>
            </div>
            <textarea
              value={motivoNovedad}
              onChange={(e) => setMotivoNovedad(e.target.value.toUpperCase())}
              rows={3}
              autoFocus
              className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white px-3.5 py-3 text-sm focus:border-orange-400 focus:ring-2 focus:ring-orange-500/15 outline-none resize-none"
              placeholder="Ej: El monto no coincide con la ruta registrada..."
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-2 justify-end pt-1">
              <button
                onClick={() => setIdANovedad(null)}
                disabled={enviandoNovedad}
                className="px-4 py-2.5 text-sm font-medium text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition"
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
