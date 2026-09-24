// components/PanelCoordinador.tsx
// Panel de Coordinador: cola de solicitudes APROBADAS dentro de su
// alcance, listas para revisar. Marca "Revisada" (pasa a Nómina) o
// "Discrepancia" (regresa a Aprobada con un motivo). Vista alterna
// agrupada por colaborador, con desglose por ruta.

"use client";

import { useState, useMemo, useEffect } from "react";
import { formatearMoneda } from "../lib/formato";
import { IconoCheck, IconoDevolver } from "./Icons";
import EstadoVacio from "./EstadoVacio";
import Avatar from "./Avatar";
import SelectorVista from "./SelectorVista";
import ComboboxBuscable from "./ComboboxBuscable";
import BarraFiltros, { CampoFiltro, chipOpcion, chips } from "./BarraFiltros";
import Paginacion from "./Paginacion";
import Modal from "./Modal";
import { formatearFecha } from "../lib/fechas";
import Spinner from "./Spinner";
import { useReportarCarga } from "../lib/cargaGlobal";
import { useToast } from "./Toast";
import TablaColaboradores, { type FilaColaborador } from "./TablaColaboradores";
import EncabezadoOrdenable from "./EncabezadoOrdenable";
import { useOrdenTabla } from "../lib/useOrdenTabla";
import { useNavegacionFilas } from "../lib/useNavegacionFilas";
import { avisarCambioPendientes } from "../lib/avisoPendientes";

type Aprobada = {
  id: string;
  codigo: string;
  fecha: string;
  fechaAprobacion: string | null;
  montoTotal: number;
  colaboradorId: string;
  nombreColaborador: string;
  supervisorId: string | null;
  supervisorNombre: string | null;
  empresaId: string;
  empresaNombre: string;
  sitioId: string;
  sitioNombre: string;
  areaId: string;
  areaNombre: string;
  rutaId: string;
  rutaLabel: string;
};

type CampoOrden = "codigo" | "fecha" | "nombreColaborador" | "rutaLabel" | "montoTotal";
const VALOR_ORDEN: Record<CampoOrden, (a: Aprobada) => string | number> = {
  codigo: (a) => a.codigo,
  fecha: (a) => a.fecha,
  nombreColaborador: (a) => a.nombreColaborador,
  rutaLabel: (a) => a.rutaLabel,
  montoTotal: (a) => a.montoTotal,
};

const POR_PAGINA = 15;

// Sentinel para el filtro "Sin supervisor (solicita directo)" — no es un
// id real de colaborador, así que no puede chocar con uno.
const SIN_SUPERVISOR = "__sin_supervisor__";

function opcionesUnicas<T>(items: T[], idKey: keyof T, labelKey: keyof T) {
  const vistos = new Map<string, string>();
  for (const item of items) {
    const id = String(item[idKey]);
    if (!vistos.has(id)) vistos.set(id, String(item[labelKey]));
  }
  return Array.from(vistos.entries()).map(([id, label]) => ({ id, label }));
}

export default function PanelCoordinador() {
  const toast = useToast();

  // Copia local editable: al revisar/devolver se quita la fila al instante,
  // sin esperar un router.refresh() ni volver a pedir la lista al servidor.
  const [aprobadas, setAprobadas] = useState<Aprobada[]>([]);
  const [sinAsignaciones, setSinAsignaciones] = useState(false);
  const [cargandoInicial, setCargandoInicial] = useState(true);
  const [errorInicial, setErrorInicial] = useState("");
  useReportarCarga(cargandoInicial);

  useEffect(() => {
    let cancelado = false;
    fetch("/api/coordinador/revision/aprobadas")
      .then(async (res) => {
        if (cancelado) return;
        if (!res.ok) {
          setErrorInicial("No se pudo cargar la información. Intenta de nuevo.");
          return;
        }
        const data = await res.json();
        setAprobadas(data.aprobadas);
        setSinAsignaciones(data.sinAsignaciones);
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
  const [supervisorId, setSupervisorId] = useState("");
  const [colaboradorId, setColaboradorId] = useState("");
  const [paginaActual, setPaginaActual] = useState(1);

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
  const supervisoresBase = useMemo(
    () => (areaId ? areasBase.filter((a) => a.areaId === areaId) : areasBase),
    [areasBase, areaId]
  );
  // Solo supervisores con algo pendiente de revisar dentro de lo ya
  // filtrado arriba (no todos los supervisores de la empresa), más "Sin
  // supervisor" para quienes solicitan directo con su propio PIN.
  const supervisoresOpciones = useMemo(() => {
    const vistos = new Map<string, string>();
    let haySinSupervisor = false;
    for (const a of supervisoresBase) {
      if (a.supervisorId) vistos.set(a.supervisorId, a.supervisorNombre ?? "");
      else haySinSupervisor = true;
    }
    const opciones = Array.from(vistos.entries())
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
    if (haySinSupervisor) opciones.push({ id: SIN_SUPERVISOR, label: "Sin supervisor (solicita directo)" });
    return opciones;
  }, [supervisoresBase]);
  const colaboradoresBase = useMemo(() => {
    if (supervisorId === SIN_SUPERVISOR) return supervisoresBase.filter((a) => !a.supervisorId);
    if (supervisorId) return supervisoresBase.filter((a) => a.supervisorId === supervisorId);
    return supervisoresBase;
  }, [supervisoresBase, supervisorId]);
  const colaboradoresOpciones = useMemo(
    () => opcionesUnicas(colaboradoresBase, "colaboradorId", "nombreColaborador"),
    [colaboradoresBase]
  );

  const cambiarEmpresa = (v: string) => { setEmpresaId(v); setSitioId(""); setAreaId(""); setSupervisorId(""); setColaboradorId(""); setPaginaActual(1); };
  const cambiarSitio = (v: string) => { setSitioId(v); setAreaId(""); setSupervisorId(""); setColaboradorId(""); setPaginaActual(1); };
  const cambiarArea = (v: string) => { setAreaId(v); setSupervisorId(""); setColaboradorId(""); setPaginaActual(1); };
  const cambiarSupervisor = (v: string) => { setSupervisorId(v); setColaboradorId(""); setPaginaActual(1); };
  const cambiarColaboradorFiltro = (v: string) => { setColaboradorId(v); setPaginaActual(1); };

  const aprobadasFiltradas = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return aprobadas.filter((s) => {
      if (empresaId && s.empresaId !== empresaId) return false;
      if (sitioId && s.sitioId !== sitioId) return false;
      if (areaId && s.areaId !== areaId) return false;
      if (supervisorId === SIN_SUPERVISOR && s.supervisorId) return false;
      if (supervisorId && supervisorId !== SIN_SUPERVISOR && s.supervisorId !== supervisorId) return false;
      if (colaboradorId && s.colaboradorId !== colaboradorId) return false;
      if (!texto) return true;
      return (
        s.codigo.toLowerCase().includes(texto) ||
        s.nombreColaborador.toLowerCase().includes(texto) ||
        s.rutaLabel.toLowerCase().includes(texto)
      );
    });
  }, [aprobadas, empresaId, sitioId, areaId, supervisorId, colaboradorId, busqueda]);

  const cambiarBusqueda = (v: string) => { setBusqueda(v); setPaginaActual(1); };

  const { orden, ordenar, itemsOrdenados: aprobadasOrdenadas } = useOrdenTabla<Aprobada, CampoOrden>(
    aprobadasFiltradas,
    (a, campo) => VALOR_ORDEN[campo](a),
    "coordinador-revision"
  );

  const totalPaginas = Math.max(1, Math.ceil(aprobadasFiltradas.length / POR_PAGINA));
  const aprobadasPagina = useMemo(
    () => aprobadasOrdenadas.slice((paginaActual - 1) * POR_PAGINA, paginaActual * POR_PAGINA),
    [aprobadasOrdenadas, paginaActual]
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

  // --- Agrupación por colaborador (client-side, cola acotada) ---
  const gruposPorColaborador = useMemo(() => {
    const mapa = new Map<string, { nombre: string; items: Aprobada[] }>();
    for (const r of aprobadasFiltradas) {
      if (!mapa.has(r.colaboradorId)) mapa.set(r.colaboradorId, { nombre: r.nombreColaborador, items: [] });
      mapa.get(r.colaboradorId)!.items.push(r);
    }
    return mapa;
  }, [aprobadasFiltradas]);

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

  const [idARevisar, setIdARevisar] = useState<string | null>(null);
  const [revisando, setRevisando] = useState(false);
  const [confirmandoLote, setConfirmandoLote] = useState(false);
  const [revisandoLote, setRevisandoLote] = useState(false);

  const [idADiscrepancia, setIdADiscrepancia] = useState<string | null>(null);
  const [motivoDiscrepancia, setMotivoDiscrepancia] = useState("");
  const [enviandoDiscrepancia, setEnviandoDiscrepancia] = useState(false);

  const [confirmandoLoteDiscrepancia, setConfirmandoLoteDiscrepancia] = useState(false);
  const [motivoLoteDiscrepancia, setMotivoLoteDiscrepancia] = useState("");
  const [enviandoLoteDiscrepancia, setEnviandoLoteDiscrepancia] = useState(false);

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
      avisarCambioPendientes();
      setAprobadas((prev) => prev.filter((s) => s.id !== idARevisar));
      // Si esta fila también estaba tildada para el lote, se saca — si no,
      // el contador de "Revisar (N)"/"Discrepancia (N)" queda contando una
      // fila que ya no existe.
      setSeleccionadas((prev) => {
        if (!prev.has(idARevisar)) return prev;
        const siguiente = new Set(prev);
        siguiente.delete(idARevisar);
        return siguiente;
      });
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
      avisarCambioPendientes();
      const idsRevisados = new Set(seleccionadas);
      setAprobadas((prev) => prev.filter((s) => !idsRevisados.has(s.id)));
      setSeleccionadas(new Set());
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
      const res = await fetch(`/api/solicitudes/${idADiscrepancia}/revertir`, {
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
      toast.exito("Solicitud devuelta a Talento Humano");
      avisarCambioPendientes();
      setAprobadas((prev) => prev.filter((s) => s.id !== idADiscrepancia));
      setSeleccionadas((prev) => {
        if (!prev.has(idADiscrepancia)) return prev;
        const siguiente = new Set(prev);
        siguiente.delete(idADiscrepancia);
        return siguiente;
      });
      setIdADiscrepancia(null);
    } catch {
      setError("No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.");
      toast.error("No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setEnviandoDiscrepancia(false);
    }
  };

  const confirmarDiscrepanciaLote = async () => {
    if (motivoLoteDiscrepancia.trim().length < 3) {
      setError("Escribe la discrepancia encontrada (mínimo 3 caracteres)");
      return;
    }
    setEnviandoLoteDiscrepancia(true);
    setError("");
    try {
      const res = await fetch(`/api/solicitudes/revertir-lote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(seleccionadas), motivo: motivoLoteDiscrepancia }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "No se pudo devolver el lote");
        toast.error(data.error ?? "No se pudo devolver el lote");
        return;
      }
      toast.exito("Solicitudes devueltas a Talento Humano");
      avisarCambioPendientes();
      const idsDevueltos = new Set(seleccionadas);
      setAprobadas((prev) => prev.filter((s) => !idsDevueltos.has(s.id)));
      setSeleccionadas(new Set());
      setConfirmandoLoteDiscrepancia(false);
    } catch {
      setError("No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.");
      toast.error("No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setEnviandoLoteDiscrepancia(false);
    }
  };

  const { filaActiva, setFilaActiva, alPresionar, contenedorRef } = useNavegacionFilas(aprobadasPagina, (a) =>
    setIdARevisar(a.id)
  );

  return (
    <div className="flex flex-col">
      <div className="flex-1 px-4 sm:px-8 pb-5 space-y-4">
        {errorInicial && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{errorInicial}</div>
        )}

        {sinAsignaciones && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-xl px-4 py-3">
            Todavía no tienes ninguna Empresa/Sitio/Área asignada. Pide al Super Administrador que te
            asigne al menos una para poder ver solicitudes.
          </div>
        )}

        {!cargandoInicial && (
        <>
        <BarraFiltros
          busqueda={{ valor: busqueda, onCambiar: cambiarBusqueda, placeholder: "Buscar...", ayuda: "Busca por código, colaborador o ruta" }}
          chips={chips(
            chipOpcion("Empresa", empresasOpciones, empresaId, () => cambiarEmpresa("")),
            chipOpcion("Sitio", sitiosOpciones, sitioId, () => cambiarSitio("")),
            chipOpcion("Área", areasOpciones, areaId, () => cambiarArea("")),
            chipOpcion("Supervisor", supervisoresOpciones, supervisorId, () => cambiarSupervisor("")),
            chipOpcion("Colaborador", colaboradoresOpciones, colaboradorId, () => cambiarColaboradorFiltro(""))
          )}
          onLimpiar={() => cambiarEmpresa("")}
          resultados={aprobadasFiltradas.length}
          acciones={<SelectorVista valor={vista} onCambiar={setVista} />}
        >
          <CampoFiltro etiqueta="Empresa">
            <ComboboxBuscable opciones={empresasOpciones} value={empresaId} onChange={cambiarEmpresa} placeholder="Todos" />
          </CampoFiltro>
          <CampoFiltro etiqueta="Sitio">
            <ComboboxBuscable opciones={sitiosOpciones} value={sitioId} onChange={cambiarSitio} placeholder="Todos" />
          </CampoFiltro>
          <CampoFiltro etiqueta="Área">
            <ComboboxBuscable opciones={areasOpciones} value={areaId} onChange={cambiarArea} placeholder="Todos" />
          </CampoFiltro>
          <CampoFiltro etiqueta="Supervisor">
            <ComboboxBuscable opciones={supervisoresOpciones} value={supervisorId} onChange={cambiarSupervisor} placeholder="Todos" />
          </CampoFiltro>
          <CampoFiltro etiqueta="Colaborador">
            <ComboboxBuscable opciones={colaboradoresOpciones} value={colaboradorId} onChange={cambiarColaboradorFiltro} placeholder="Todos" />
          </CampoFiltro>
        </BarraFiltros>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 bg-white border border-neutral-200 dark:bg-neutral-900 dark:border-neutral-800 rounded-xl px-4 py-3">
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">Mostrando</p>
            <p className="text-lg font-bold text-neutral-900 dark:text-white">
              {aprobadasFiltradas.length} {aprobadasFiltradas.length === 1 ? "solicitud" : "solicitudes"} · {formatearMoneda(totalGeneral)}
            </p>
          </div>
          {seleccionadas.size > 0 && (
            <div className="flex-1 bg-sky-500/10 border border-sky-500/30 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] text-sky-600 dark:text-sky-400 uppercase tracking-wide">Seleccionadas</p>
                <p className="text-lg font-bold text-sky-700 dark:text-sky-300">
                  {seleccionadas.size} · {formatearMoneda(totalSeleccionado)}
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => setConfirmandoLoteDiscrepancia(true)}
                  title="Reportar discrepancia"
                  className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs sm:text-sm font-medium text-neutral-500 dark:text-neutral-400 border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-700 dark:hover:text-neutral-200 px-3 py-2 rounded-lg transition"
                >
                  <IconoDevolver className="w-4 h-4 shrink-0" /> Discrepancia ({seleccionadas.size})
                </button>
                <button
                  onClick={() => setConfirmandoLote(true)}
                  className="whitespace-nowrap text-xs sm:text-sm font-semibold bg-sky-600 hover:bg-sky-700 text-white px-3 py-2 rounded-lg transition shadow-sm hover:shadow-md"
                >
                  Revisar ({seleccionadas.size})
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
            clave={(s) => s.id}
            porPagina={POR_PAGINA}
            claveOrden="coordinador-revision-colaborador"
            seleccion={{
              seleccionadas,
              alternar: alternarSeleccion,
              idsDe: (colaboradorId) => (gruposPorColaborador.get(colaboradorId)?.items ?? []).map((s) => s.id),
              alternarGrupo: alternarGrupoSeleccion,
            }}
            columnas={[
              { encabezado: "Código", render: (s) => <span className="font-mono">{s.codigo}</span> },
              { encabezado: "Fecha", render: (s) => formatearFecha(s.fecha) },
              { encabezado: "Ruta", render: (s) => s.rutaLabel },
              { encabezado: "Valor", render: (s) => formatearMoneda(s.montoTotal) },
            ]}
            acciones={(s) => (
              <div className="flex gap-1.5">
                <button
                  onClick={() => setIdARevisar(s.id)}
                  className="text-xs font-medium text-white bg-sky-600 hover:bg-sky-700 px-3 py-1.5 rounded-full transition"
                >
                  Revisar
                </button>
                <button
                  onClick={() => abrirDiscrepancia(s.id)}
                  title="Reportar discrepancia"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-500 dark:text-neutral-400 border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-700 dark:hover:text-neutral-200 px-2.5 py-1.5 rounded-lg transition"
                >
                  <IconoDevolver className="w-3.5 h-3.5" /> Discrepancia
                </button>
              </div>
            )}
            vacio={busqueda ? "Sin resultados para esa búsqueda" : sinAsignaciones ? "Sin áreas asignadas" : "No hay solicitudes aprobadas pendientes de revisión"}
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
              <table className="w-full text-xs min-w-[680px]">
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
                    <EncabezadoOrdenable campo="fecha" ordenActivo={orden} onOrdenar={ordenar}>Fecha</EncabezadoOrdenable>
                    <EncabezadoOrdenable campo="nombreColaborador" ordenActivo={orden} onOrdenar={ordenar}>Colaborador</EncabezadoOrdenable>
                    <EncabezadoOrdenable campo="rutaLabel" ordenActivo={orden} onOrdenar={ordenar}>Ruta</EncabezadoOrdenable>
                    <EncabezadoOrdenable campo="montoTotal" ordenActivo={orden} onOrdenar={ordenar}>Valor</EncabezadoOrdenable>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {aprobadasPagina.map((s, i) => (
                    <tr
                      key={s.id}
                      onClick={() => setFilaActiva(i)}
                      className={`border-t border-neutral-200/70 dark:border-neutral-800/70 hover:bg-neutral-100/60 dark:hover:bg-neutral-800/60 transition ${
                        i === filaActiva ? "bg-orange-50 dark:bg-orange-500/10" : ""
                      }`}
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={seleccionadas.has(s.id)}
                          onChange={() => alternarSeleccion(s.id)}
                          className="w-4 h-4 accent-orange-500 rounded"
                        />
                      </td>
                      <td className="px-4 py-3 font-mono font-bold tracking-widest text-neutral-500 dark:text-neutral-400">{s.codigo}</td>
                      <td className="px-4 py-3">{formatearFecha(s.fecha)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar nombre={s.nombreColaborador} indice={i} className="w-7 h-7 text-[11px]" />
                          <span>{s.nombreColaborador}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-neutral-600">{s.rutaLabel}</td>
                      <td className="px-4 py-3">{formatearMoneda(s.montoTotal)}</td>
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
                            title="Reportar discrepancia"
                            className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-500 dark:text-neutral-400 border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-700 dark:hover:text-neutral-200 px-2.5 py-1.5 rounded-lg transition"
                          >
                            <IconoDevolver className="w-3.5 h-3.5" /> Discrepancia
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {aprobadasFiltradas.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-10">
                        <EstadoVacio
                          mensaje={
                            busqueda
                              ? "Sin resultados para esa búsqueda"
                              : sinAsignaciones
                              ? "Sin áreas asignadas"
                              : "No hay solicitudes aprobadas pendientes de revisión"
                          }
                        />
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
      </div>

      <Modal abierto={!!idARevisar} onCerrar={() => setIdARevisar(null)} onConfirmar={confirmarRevisar} variante="centro" className="bg-white dark:bg-neutral-900 text-black dark:text-white rounded-3xl p-7 w-full max-w-xs text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center mx-auto"><IconoCheck className="w-6 h-6" /></div>
            <p className="font-semibold text-neutral-900 dark:text-white">¿Marcar esta solicitud como revisada?</p>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-2 justify-center pt-1">
              <button
                onClick={() => setIdARevisar(null)}
                disabled={revisando}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
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

      <Modal abierto={confirmandoLote} onCerrar={() => setConfirmandoLote(false)} onConfirmar={confirmarRevisarLote} variante="centro" className="bg-white dark:bg-neutral-900 text-black dark:text-white rounded-3xl p-7 w-full max-w-xs text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center mx-auto"><IconoCheck className="w-6 h-6" /></div>
            <p className="font-semibold text-neutral-900 dark:text-white">¿Marcar {seleccionadas.size} solicitudes como revisadas?</p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Total: {formatearMoneda(totalSeleccionado)}</p>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-2 justify-center pt-1">
              <button
                onClick={() => setConfirmandoLote(false)}
                disabled={revisandoLote}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
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

      <Modal abierto={confirmandoLoteDiscrepancia} onCerrar={() => setConfirmandoLoteDiscrepancia(false)} onConfirmar={confirmarDiscrepanciaLote} variante="centro" className="bg-white dark:bg-neutral-900 text-black dark:text-white rounded-3xl p-7 w-full max-w-sm space-y-4 shadow-2xl">
            <div>
              <h2 className="font-semibold text-neutral-900 dark:text-white">Discrepancia en {seleccionadas.size} solicitudes</h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                Todas vuelven a Pendiente para que Talento Humano las corrija.
              </p>
            </div>
            <textarea
              value={motivoLoteDiscrepancia}
              onChange={(e) => setMotivoLoteDiscrepancia(e.target.value.toUpperCase())}
              rows={3}
              autoFocus
              className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white px-3.5 py-3 text-sm focus:border-orange-400 focus:ring-2 focus:ring-orange-500/15 outline-none resize-none"
              placeholder="Ej: La ruta no corresponde al área del colaborador..."
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-2 justify-end pt-1">
              <button
                onClick={() => setConfirmandoLoteDiscrepancia(false)}
                disabled={enviandoLoteDiscrepancia}
                className="px-4 py-2.5 text-sm font-medium text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarDiscrepanciaLote}
                disabled={enviandoLoteDiscrepancia}
                className="px-5 py-2.5 text-sm font-semibold bg-neutral-800 hover:bg-neutral-900 text-white rounded-xl disabled:opacity-50 transition flex items-center justify-center gap-2"
              >
                {enviandoLoteDiscrepancia && <Spinner className="w-4 h-4" />}
                {enviandoLoteDiscrepancia ? "Enviando..." : "Devolver todas"}
              </button>
            </div>
      </Modal>

      <Modal abierto={!!idADiscrepancia} onCerrar={() => setIdADiscrepancia(null)} onConfirmar={confirmarDiscrepancia} variante="centro" className="bg-white dark:bg-neutral-900 text-black dark:text-white rounded-3xl p-7 w-full max-w-sm space-y-4 shadow-2xl">
            <div>
              <h2 className="font-semibold text-neutral-900 dark:text-white">Reportar discrepancia</h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                La solicitud vuelve a Pendiente para que Talento Humano la corrija.
              </p>
            </div>
            <textarea
              value={motivoDiscrepancia}
              onChange={(e) => setMotivoDiscrepancia(e.target.value.toUpperCase())}
              rows={3}
              autoFocus
              className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white px-3.5 py-3 text-sm focus:border-orange-400 focus:ring-2 focus:ring-orange-500/15 outline-none resize-none"
              placeholder="Ej: La ruta no corresponde al área del colaborador..."
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-2 justify-end pt-1">
              <button
                onClick={() => setIdADiscrepancia(null)}
                disabled={enviandoDiscrepancia}
                className="px-4 py-2.5 text-sm font-medium text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition"
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
