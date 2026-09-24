// components/PanelControlSolicitudes.tsx
// Control de Solicitudes (solo Super Admin): tabla paginada de TODAS las
// solicitudes en cualquier estado, buscable por su código corto, con la
// opción de eliminar cualquiera sin importar el estado (control de
// errores) — el resto de roles solo puede eliminar Pendientes/Rechazadas
// propias, y solo desde "Mis Pasajes".

"use client";

import { useState, useEffect } from "react";
import { formatearMoneda } from "../lib/formato";
import { DESCRIPCION_ESTADO } from "../lib/estadosSolicitud";
import EstadoVacio from "./EstadoVacio";
import Avatar from "./Avatar";
import RangoFechasSelector from "./RangoFechasSelector";
import SelectorModerno from "./SelectorModerno";
import ComboboxBuscable from "./ComboboxBuscable";
import BarraFiltros, { CampoFiltro, chipOpcion, chips } from "./BarraFiltros";
import Paginacion from "./Paginacion";
import TablaEsqueleto from "./TablaEsqueleto";
import EncabezadoOrdenable from "./EncabezadoOrdenable";
import { useToast } from "./Toast";
import { formatearFecha, fechaHoyTexto } from "../lib/fechas";
import { useOrdenTabla } from "../lib/useOrdenTabla";

type Fila = {
  id: string;
  codigo: string;
  fecha: string;
  montoTotal: number;
  estado: string;
  nombreColaborador: string;
  rutaLabel: string;
};

type CampoOrden = "fecha" | "nombreColaborador" | "rutaLabel" | "montoTotal" | "estado";
const VALOR_ORDEN: Record<CampoOrden, (f: Fila) => string | number> = {
  fecha: (f) => f.fecha,
  nombreColaborador: (f) => f.nombreColaborador,
  rutaLabel: (f) => f.rutaLabel,
  montoTotal: (f) => f.montoTotal,
  estado: (f) => f.estado,
};

const OPCIONES_ESTADO = [
  { value: "", label: "Todos" },
  { value: "PENDIENTE", label: "Pendiente" },
  { value: "APROBADA", label: "Aprobada" },
  { value: "RECHAZADA", label: "Rechazada" },
  { value: "PAGADA", label: "Pagada" },
];

const ESTILOS_ESTADO: Record<string, string> = {
  PENDIENTE: "bg-amber-100 text-amber-800",
  APROBADA: "bg-green-100 text-green-800",
  RECHAZADA: "bg-red-100 text-red-800",
  PAGADA: "bg-orange-100 text-orange-800",
};

export default function PanelControlSolicitudes() {
  const toast = useToast();

  const [colaboradores, setColaboradores] = useState<{ id: string; nombreCompleto: string }[]>([]);

  useEffect(() => {
    let cancelado = false;
    fetch("/api/admin/solicitudes/colaboradores")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { id: string; nombreCompleto: string }[] | null) => {
        if (!cancelado && data) setColaboradores(data);
      })
      .catch(() => {});
    return () => {
      cancelado = true;
    };
  }, []);

  const [codigo, setCodigo] = useState("");
  const [estado, setEstado] = useState("");
  const [colaboradorId, setColaboradorId] = useState("");
  const [desde, setDesde] = useState(fechaHoyTexto);
  const [hasta, setHasta] = useState(fechaHoyTexto);

  const [items, setItems] = useState<Fila[] | null>(null);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  const { orden, ordenar, itemsOrdenados } = useOrdenTabla<Fila, CampoOrden>(
    items ?? [],
    (f, campo) => VALOR_ORDEN[campo](f),
    "control-solicitudes"
  );

  const opcionesColaborador = [
    { id: "", label: "Todos" },
    ...colaboradores.map((c) => ({ id: c.id, label: c.nombreCompleto })),
  ];

  const buscar = async (paginaNueva = 1) => {
    setCargando(true);
    setError("");
    const params = new URLSearchParams({ pagina: String(paginaNueva) });
    if (codigo.trim()) params.set("codigo", codigo.trim());
    if (estado) params.set("estado", estado);
    if (colaboradorId) params.set("colaboradorId", colaboradorId);
    if (desde) params.set("desde", desde);
    if (hasta) params.set("hasta", hasta);

    try {
      const res = await fetch(`/api/admin/solicitudes?${params.toString()}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "No se pudo cargar el listado");
        return;
      }
      const data = await res.json();
      setItems(data.items);
      setTotal(data.total);
      setTotalPaginas(data.totalPaginas);
      setPagina(paginaNueva);
    } catch {
      setError("No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setCargando(false);
    }
  };

  // Busca sola al entrar, al cambiar el rango de fechas, al completar (o
  // borrar) el código y al quitar un chip — Estado y Colaborador se eligen
  // en el panel y se aplican juntos. En un efecto porque buscar() arma la
  // URL con el estado de ESTE render; recién el siguiente ve el cambio.
  const [pedidoBusqueda, setPedidoBusqueda] = useState(1);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- dispara una consulta de red
    if (pedidoBusqueda) buscar(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pedidoBusqueda]);
  const rebuscar = () => setPedidoBusqueda((n) => n + 1);

  // Los códigos tienen 4 caracteres: se consulta al completarlo (o al
  // vaciarlo), no con cada tecla.
  const cambiarCodigo = (v: string) => {
    const nuevo = v.toUpperCase().slice(0, 4);
    setCodigo(nuevo);
    if (nuevo.length === 4 || (nuevo.length === 0 && codigo.length > 0)) rebuscar();
  };

  const chipsFiltros = chips(
    chipOpcion("Estado", OPCIONES_ESTADO.map((o) => ({ id: o.value, label: o.label })), estado, () => { setEstado(""); rebuscar(); }),
    chipOpcion("Colaborador", opcionesColaborador, colaboradorId, () => { setColaboradorId(""); rebuscar(); })
  );

  const limpiarFiltros = () => {
    setEstado("");
    setColaboradorId("");
    rebuscar();
  };

  // Optimista con deshacer: la fila desaparece al toque; el DELETE real
  // recién se manda si nadie tocó "Deshacer" en el toast.
  const eliminarConDeshacer = (s: Fila) => {
    const indiceOriginal = items?.findIndex((item) => item.id === s.id) ?? -1;
    setItems((prev) => (prev ? prev.filter((item) => item.id !== s.id) : prev));
    toast.deshacer(
      "Solicitud eliminada",
      () => {
        setItems((prev) => {
          if (!prev) return prev;
          const copia = [...prev];
          copia.splice(Math.min(indiceOriginal, copia.length), 0, s);
          return copia;
        });
      },
      async () => {
        try {
          const res = await fetch(`/api/solicitudes/${s.id}`, { method: "DELETE" });
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            toast.error(data.error ?? "No se pudo eliminar la solicitud");
            buscar(pagina);
          }
        } catch {
          toast.error("No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.");
          buscar(pagina);
        }
      }
    );
  };

  return (
    <div className="flex-1 px-4 sm:px-8 pb-5 space-y-4">

      <BarraFiltros
        busqueda={{ valor: codigo, onCambiar: cambiarCodigo, placeholder: "Buscar por código (ej: 7K3M)", onEnter: rebuscar, className: "uppercase font-semibold tracking-widest placeholder:normal-case placeholder:font-normal placeholder:tracking-normal" }}
        chips={chipsFiltros}
        onLimpiar={limpiarFiltros}
        onAplicar={() => buscar(1)}
        aplicando={cargando}
        textoAplicar="Aplicar"
        destacado={
          <RangoFechasSelector desde={desde} hasta={hasta} onChange={(d, h) => { setDesde(d); setHasta(h); rebuscar(); }} />
        }
      >
        <CampoFiltro etiqueta="Estado">
          <SelectorModerno opciones={OPCIONES_ESTADO} value={estado} onChange={setEstado} placeholder="Todos" />
        </CampoFiltro>
        <CampoFiltro etiqueta="Colaborador">
          <ComboboxBuscable opciones={opcionesColaborador} value={colaboradorId} onChange={setColaboradorId} placeholder="Todos" />
        </CampoFiltro>
      </BarraFiltros>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {!cargando && items && (
        <div className="bg-white border border-neutral-200 dark:bg-neutral-900 dark:border-neutral-800 rounded-xl px-4 py-3">
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">Total con estos filtros</p>
          <p className="text-lg font-bold text-neutral-900 dark:text-white">{total} {total === 1 ? "solicitud" : "solicitudes"}</p>
        </div>
      )}

      {!items && !cargando && (
        <div className="bg-neutral-50 dark:bg-neutral-900 border border-dashed border-neutral-300 dark:border-neutral-700 rounded-2xl px-5 py-10 text-center text-sm text-neutral-500 dark:text-neutral-400">
          Elige un rango de fechas o escribe un código para consultar las solicitudes.
        </div>
      )}

      {cargando && <TablaEsqueleto columnas={7} />}

      {!cargando && items && (
        <div className="bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 rounded-2xl overflow-hidden shadow-sm ring-1 ring-black/5 dark:ring-white/10">
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[760px]">
              <thead className="bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Código</th>
                  <EncabezadoOrdenable campo="fecha" ordenActivo={orden} onOrdenar={ordenar}>Fecha</EncabezadoOrdenable>
                  <EncabezadoOrdenable campo="nombreColaborador" ordenActivo={orden} onOrdenar={ordenar}>Colaborador</EncabezadoOrdenable>
                  <EncabezadoOrdenable campo="rutaLabel" ordenActivo={orden} onOrdenar={ordenar}>Ruta</EncabezadoOrdenable>
                  <EncabezadoOrdenable campo="montoTotal" ordenActivo={orden} onOrdenar={ordenar}>Valor</EncabezadoOrdenable>
                  <EncabezadoOrdenable campo="estado" ordenActivo={orden} onOrdenar={ordenar}>Estado</EncabezadoOrdenable>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {itemsOrdenados.map((s, i) => (
                  <tr key={s.id} className="border-t border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/60 transition">
                    <td className="px-4 py-3 font-mono font-bold tracking-widest text-neutral-700 dark:text-neutral-300">{s.codigo}</td>
                    <td className="px-4 py-3">{formatearFecha(s.fecha)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar nombre={s.nombreColaborador} indice={i} className="w-7 h-7 text-[11px]" />
                        <span>{s.nombreColaborador}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-neutral-600 dark:text-neutral-300">{s.rutaLabel}</td>
                    <td className="px-4 py-3">{formatearMoneda(s.montoTotal)}</td>
                    <td className="px-4 py-3">
                      <span title={DESCRIPCION_ESTADO[s.estado]} className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${ESTILOS_ESTADO[s.estado]}`}>
                        {s.estado}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => eliminarConDeshacer(s)}
                        className="text-xs font-medium text-white bg-red-500 hover:bg-red-600 px-3 py-1.5 rounded-full transition"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10">
                      <EstadoVacio mensaje="Sin resultados para esos filtros" />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <Paginacion paginaActual={pagina} totalPaginas={totalPaginas} onCambiarPagina={buscar} deshabilitado={cargando} />
        </div>
      )}

    </div>
  );
}
