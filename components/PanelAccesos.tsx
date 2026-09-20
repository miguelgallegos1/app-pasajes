// components/PanelAccesos.tsx
// Bitácora de accesos (Super Admin): quién entró, cuándo, desde qué IP y
// con qué método (PIN o biometría), con la opción de forzar el cierre de
// cualquier sesión activa de un usuario puntual sin esperar a que expire
// sola (30 min de inactividad como mucho).

"use client";

import { useEffect, useState } from "react";
import Avatar from "./Avatar";
import ComboboxBuscable from "./ComboboxBuscable";
import SelectorModerno from "./SelectorModerno";
import Paginacion from "./Paginacion";
import TablaEsqueleto from "./TablaEsqueleto";
import EstadoVacio from "./EstadoVacio";
import Modal from "./Modal";
import Spinner from "./Spinner";
import { useToast } from "./Toast";
import { IconoLupa, IconoHuella, IconoSalir } from "./Icons";
import { ETIQUETAS_ROL } from "../lib/roles";

type Fila = {
  id: string;
  usuarioId: string;
  nombreUsuario: string;
  rol: string;
  metodo: "PIN" | "BIOMETRIA";
  ip: string | null;
  userAgent: string | null;
  creadoEn: string;
  revocada: boolean;
};

const OPCIONES_ROL = [{ id: "", label: "Todos los roles" }, ...Object.entries(ETIQUETAS_ROL).map(([value, label]) => ({ id: value, label }))];
const OPCIONES_METODO = [
  { value: "", label: "Todos" },
  { value: "PIN", label: "PIN" },
  { value: "BIOMETRIA", label: "Biometría" },
];

export default function PanelAccesos() {
  const toast = useToast();
  const [busqueda, setBusqueda] = useState("");
  const [rol, setRol] = useState("");
  const [metodo, setMetodo] = useState("");
  const [pagina, setPagina] = useState(1);
  const [items, setItems] = useState<Fila[] | null>(null);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const [usuarioARevocar, setUsuarioARevocar] = useState<{ id: string; nombre: string } | null>(null);
  const [revocando, setRevocando] = useState(false);

  const cargar = async (paginaNueva = pagina) => {
    setCargando(true);
    setError("");
    const params = new URLSearchParams({ pagina: String(paginaNueva) });
    if (busqueda.trim()) params.set("busqueda", busqueda.trim());
    if (rol) params.set("rol", rol);
    if (metodo) params.set("metodo", metodo);
    try {
      const res = await fetch(`/api/admin/accesos?${params.toString()}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "No se pudo cargar la bitácora");
        return;
      }
      const data = await res.json();
      setItems(data.items);
      setTotalPaginas(data.totalPaginas);
      setPagina(paginaNueva);
    } catch {
      setError("No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setCargando(false);
    }
  };

  // Primera carga, y cada vez que cambia un filtro (vuelve a página 1). Se
  // llama desde un IIFE en vez de invocar cargar() directo para que el
  // cuerpo del effect no dispare ningún setState de forma sincrónica
  // (mismo criterio que PanelCopiarRutas.tsx).
  useEffect(() => {
    (async () => {
      await cargar(1);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busqueda, rol, metodo]);

  const confirmarRevocar = async () => {
    if (!usuarioARevocar) return;
    setRevocando(true);
    try {
      const res = await fetch(`/api/admin/accesos/${usuarioARevocar.id}/revocar`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "No se pudo cerrar la sesión");
        return;
      }
      toast.exito(`Sesión de ${usuarioARevocar.nombre} cerrada`);
      setUsuarioARevocar(null);
      cargar(pagina);
    } catch {
      toast.error("No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setRevocando(false);
    }
  };

  return (
    <div className="flex-1 px-4 sm:px-8 pb-5 space-y-4">

      <div className="bg-neutral-50 dark:bg-neutral-900 rounded-2xl p-5 shadow-sm ring-1 ring-black/5 dark:ring-white/10 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Buscar por nombre</label>
            <div className="mt-1.5 relative">
              <IconoLupa className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 dark:text-neutral-500 pointer-events-none" />
              <input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Nombre del usuario..."
                className="w-full rounded-xl border border-neutral-300 bg-white text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white pl-10 pr-4 py-2.5 text-sm placeholder-neutral-500 focus:border-orange-400 focus:ring-2 focus:ring-orange-500/15 outline-none"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Rol</label>
            <div className="mt-1.5">
              <ComboboxBuscable opciones={OPCIONES_ROL} value={rol} onChange={setRol} placeholder="Todos los roles" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Método</label>
            <div className="mt-1.5">
              <SelectorModerno opciones={OPCIONES_METODO} value={metodo} onChange={setMetodo} placeholder="Todos" />
            </div>
          </div>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      {cargando ? (
        <TablaEsqueleto columnas={6} />
      ) : (
        <div className="bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 rounded-2xl overflow-hidden shadow-sm ring-1 ring-black/5 dark:ring-white/10">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Usuario</th>
                  <th className="px-4 py-3 font-medium">Método</th>
                  <th className="px-4 py-3 font-medium">IP</th>
                  <th className="px-4 py-3 font-medium">Dispositivo</th>
                  <th className="px-4 py-3 font-medium">Fecha</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {items?.map((r, i) => (
                  <tr key={r.id} className="border-t border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/60 transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar nombre={r.nombreUsuario} indice={i} className="w-7 h-7 text-[11px]" />
                        <div className="min-w-0">
                          <p className="truncate">{r.nombreUsuario}</p>
                          <p className="text-[11px] text-neutral-400 dark:text-neutral-500">{ETIQUETAS_ROL[r.rol] ?? r.rol}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full ${
                          r.metodo === "BIOMETRIA" ? "bg-violet-100 text-violet-800" : "bg-neutral-100 text-neutral-700"
                        }`}
                      >
                        {r.metodo === "BIOMETRIA" && <IconoHuella className="w-3 h-3" />}
                        {r.metodo === "BIOMETRIA" ? "Biometría" : "PIN"}
                      </span>
                      {r.revocada && (
                        <span className="block mt-1 text-[10px] font-medium text-neutral-400 dark:text-neutral-500">Sesión cerrada</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-neutral-600 dark:text-neutral-300 font-mono text-xs">{r.ip ?? "—"}</td>
                    <td className="px-4 py-3 text-neutral-500 dark:text-neutral-400 max-w-[220px] truncate" title={r.userAgent ?? ""}>
                      {r.userAgent ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{new Date(r.creadoEn).toLocaleDateString("es-EC")}</p>
                      <p className="text-[11px] text-neutral-400 dark:text-neutral-500">
                        {new Date(r.creadoEn).toLocaleTimeString("es-EC", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setUsuarioARevocar({ id: r.usuarioId, nombre: r.nombreUsuario })}
                        title="Cerrar sesión"
                        className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-medium text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-950/30 px-2.5 py-1.5 rounded-lg transition"
                      >
                        <IconoSalir className="w-3.5 h-3.5 shrink-0" /> Cerrar
                      </button>
                    </td>
                  </tr>
                ))}
                {items?.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-10">
                      <EstadoVacio mensaje="Sin accesos que coincidan con esos filtros" />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <Paginacion paginaActual={pagina} totalPaginas={totalPaginas} onCambiarPagina={cargar} deshabilitado={cargando} />
        </div>
      )}

      <Modal
        abierto={!!usuarioARevocar}
        onCerrar={() => setUsuarioARevocar(null)}
        onConfirmar={confirmarRevocar}
        variante="centro"
        className="bg-white dark:bg-neutral-900 text-black dark:text-white rounded-3xl p-7 w-full max-w-xs text-center space-y-4 shadow-2xl"
      >
        <p className="font-semibold text-neutral-900 dark:text-white">¿Cerrar la sesión de {usuarioARevocar?.nombre}?</p>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Se cierra en todos sus dispositivos a la vez. Va a tener que volver a entrar con su PIN o biometría.
        </p>
        <div className="flex gap-2 justify-center pt-1">
          <button
            onClick={() => setUsuarioARevocar(null)}
            disabled={revocando}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
          >
            Cancelar
          </button>
          <button
            onClick={confirmarRevocar}
            disabled={revocando}
            className="flex-1 px-4 py-2.5 text-sm font-semibold bg-red-500 hover:bg-red-600 text-white rounded-xl disabled:opacity-50 transition flex items-center justify-center gap-2"
          >
            {revocando && <Spinner className="w-4 h-4" />}
            {revocando ? "Cerrando..." : "Sí, cerrar"}
          </button>
        </div>
      </Modal>
    </div>
  );
}
