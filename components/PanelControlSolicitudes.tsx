// components/PanelControlSolicitudes.tsx
// Control de Solicitudes (solo Super Admin): tabla paginada de TODAS las
// solicitudes en cualquier estado, buscable por su código corto, con la
// opción de eliminar cualquiera sin importar el estado (control de
// errores) — el resto de roles solo puede eliminar Pendientes/Rechazadas
// propias, y solo desde "Mis Pasajes".

"use client";

import { useState, useEffect } from "react";
import CalendarioSelector from "./CalendarioSelector";
import SelectorModerno from "./SelectorModerno";
import ComboboxBuscable from "./ComboboxBuscable";
import Paginacion from "./Paginacion";
import Modal from "./Modal";
import Spinner from "./Spinner";
import { useToast } from "./Toast";
import { formatearFecha } from "../lib/fechas";

type Fila = {
  id: string;
  codigo: string;
  fecha: string;
  montoTotal: number;
  estado: string;
  nombreColaborador: string;
  rutaLabel: string;
};

const ESTILOS_ESTADO: Record<string, string> = {
  PENDIENTE: "bg-amber-100 text-amber-800",
  APROBADA: "bg-green-100 text-green-800",
  RECHAZADA: "bg-red-100 text-red-800",
  PAGADA: "bg-orange-100 text-orange-800",
};

export default function PanelControlSolicitudes({
  colaboradores,
}: {
  colaboradores: { id: string; nombreCompleto: string }[];
}) {
  const toast = useToast();

  const [codigo, setCodigo] = useState("");
  const [estado, setEstado] = useState("");
  const [colaboradorId, setColaboradorId] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");

  const [items, setItems] = useState<Fila[] | null>(null);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  const opcionesColaborador = [
    { id: "", label: "Todos los colaboradores" },
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

    const res = await fetch(`/api/admin/solicitudes?${params.toString()}`);
    setCargando(false);
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
  };

  useEffect(() => {
    buscar(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [idAEliminar, setIdAEliminar] = useState<string | null>(null);
  const [eliminando, setEliminando] = useState(false);
  const solicitudAEliminar = items?.find((s) => s.id === idAEliminar);

  const confirmarEliminacion = async () => {
    if (!idAEliminar) return;
    setEliminando(true);
    const res = await fetch(`/api/solicitudes/${idAEliminar}`, { method: "DELETE" });
    setEliminando(false);
    setIdAEliminar(null);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "No se pudo eliminar la solicitud");
      return;
    }
    toast.exito("Solicitud eliminada");
    buscar(pagina);
  };

  return (
    <div className="flex-1 px-4 sm:px-8 py-5 space-y-4">
      <h1 className="text-lg sm:text-xl font-bold">Control de Solicitudes</h1>
      <p className="text-xs text-orange-400 font-medium">
        Rol: Super Administrador · buscá por código o filtrá, y podés eliminar cualquier solicitud sin importar su estado
      </p>

      <div className="bg-neutral-50 rounded-2xl p-5 shadow-sm ring-1 ring-black/5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Código</label>
            <input
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.toUpperCase().slice(0, 4))}
              placeholder="Ej: 7K3M"
              className="mt-1.5 w-full rounded-xl border border-neutral-200 px-3.5 py-3 text-sm font-bold tracking-widest focus:border-orange-400 focus:ring-2 focus:ring-orange-500/15 outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Estado</label>
            <div className="mt-1.5">
              <SelectorModerno
                opciones={[
                  { value: "", label: "Todos" },
                  { value: "PENDIENTE", label: "Pendiente" },
                  { value: "APROBADA", label: "Aprobada" },
                  { value: "RECHAZADA", label: "Rechazada" },
                  { value: "PAGADA", label: "Pagada" },
                ]}
                value={estado}
                onChange={setEstado}
                placeholder="Todos"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Colaborador</label>
            <div className="mt-1.5">
              <ComboboxBuscable
                opciones={opcionesColaborador}
                value={colaboradorId}
                onChange={setColaboradorId}
                placeholder="Todos"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Desde</label>
            <div className="mt-1.5">
              <CalendarioSelector value={desde} onChange={setDesde} />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Hasta</label>
            <div className="mt-1.5">
              <CalendarioSelector value={hasta} onChange={setHasta} />
            </div>
          </div>
        </div>

        <button
          onClick={() => buscar(1)}
          disabled={cargando}
          className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-5 py-2.5 rounded-xl transition shadow-sm hover:shadow-md disabled:opacity-50"
        >
          {cargando ? "Buscando..." : "Buscar"}
        </button>

        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      <div className="bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3">
        <p className="text-[11px] text-neutral-400 uppercase tracking-wide">Total con estos filtros</p>
        <p className="text-lg font-bold text-white">{total} {total === 1 ? "solicitud" : "solicitudes"}</p>
      </div>

      {items && (
        <div className="bg-white text-neutral-800 rounded-2xl overflow-hidden shadow-sm ring-1 ring-black/5">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[760px]">
              <thead className="bg-neutral-100 text-neutral-500 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Código</th>
                  <th className="px-4 py-3 font-medium">Fecha</th>
                  <th className="px-4 py-3 font-medium">Colaborador</th>
                  <th className="px-4 py-3 font-medium">Ruta</th>
                  <th className="px-4 py-3 font-medium">Valor</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((s) => (
                  <tr key={s.id} className="border-t border-neutral-100 hover:bg-neutral-50 transition">
                    <td className="px-4 py-3 font-mono font-bold tracking-widest text-neutral-700">{s.codigo}</td>
                    <td className="px-4 py-3">{formatearFecha(s.fecha)}</td>
                    <td className="px-4 py-3">{s.nombreColaborador}</td>
                    <td className="px-4 py-3 text-neutral-600">{s.rutaLabel}</td>
                    <td className="px-4 py-3">${s.montoTotal.toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${ESTILOS_ESTADO[s.estado]}`}>
                        {s.estado}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setIdAEliminar(s.id)}
                        className="text-xs font-medium text-white bg-red-500 hover:bg-red-600 px-3 py-1.5 rounded-full transition"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-neutral-400">
                      Sin resultados con esos filtros
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <Paginacion paginaActual={pagina} totalPaginas={totalPaginas} onCambiarPagina={buscar} />
        </div>
      )}

      <Modal
        abierto={!!idAEliminar}
        variante="centro"
        className="bg-white text-black rounded-3xl p-7 w-full max-w-xs text-center space-y-4 shadow-2xl"
      >
        <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto text-2xl">!</div>
        <p className="font-semibold text-neutral-900">¿Eliminar la solicitud {solicitudAEliminar?.codigo}?</p>
        <p className="text-sm text-neutral-500">
          {solicitudAEliminar?.nombreColaborador} · Estado {solicitudAEliminar?.estado}. Esta acción no se puede deshacer.
        </p>
        <div className="flex gap-2 justify-center pt-1">
          <button
            onClick={() => setIdAEliminar(null)}
            disabled={eliminando}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-neutral-600 border border-neutral-200 rounded-xl hover:bg-neutral-100 transition"
          >
            Cancelar
          </button>
          <button
            onClick={confirmarEliminacion}
            disabled={eliminando}
            className="flex-1 px-4 py-2.5 text-sm font-semibold bg-red-500 hover:bg-red-600 text-white rounded-xl disabled:opacity-50 transition flex items-center justify-center gap-2"
          >
            {eliminando && <Spinner className="w-4 h-4" />}
            {eliminando ? "Eliminando..." : "Eliminar"}
          </button>
        </div>
      </Modal>
    </div>
  );
}
