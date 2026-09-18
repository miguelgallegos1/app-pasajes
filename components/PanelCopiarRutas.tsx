// components/PanelCopiarRutas.tsx
// "Copiar rutas de un día a otro" como página propia del menú (antes era
// un modal escondido dentro de Mis Pasajes) — mismo patrón que Historial.

"use client";

import { useState, useRef, useMemo, useEffect } from "react";
import { formatearMoneda } from "../lib/formato";
import { useRouter } from "next/navigation";
import CalendarioSelector from "./CalendarioSelector";
import Spinner from "./Spinner";
import AvatarRuta from "./AvatarRuta";
import { IconoChevron, IconoCheck } from "./Icons";
import { formatearFecha, fechaHoyTexto } from "../lib/fechas";
import { useToast } from "./Toast";

type SolicitudDia = {
  id: string;
  colaboradorId: string;
  nombreColaborador: string;
  rutaId: string;
  rutaLabel: string;
  valor: number;
  estado: string;
};

const ESTILOS_ESTADO: Record<string, string> = {
  PENDIENTE: "bg-amber-100 text-amber-800",
  APROBADA: "bg-green-100 text-green-800",
  RECHAZADA: "bg-red-100 text-red-800",
  REVISADO: "bg-sky-100 text-sky-800",
  PAGADA: "bg-orange-100 text-orange-800",
};

export default function PanelCopiarRutas({ esSupervisor }: { esSupervisor: boolean }) {
  const router = useRouter();
  const toast = useToast();

  const [fechaOrigen, setFechaOrigen] = useState(fechaHoyTexto);
  const [fechaDestino, setFechaDestino] = useState(fechaHoyTexto);
  const [solicitudesOrigen, setSolicitudesOrigen] = useState<SolicitudDia[]>([]);
  const [cargandoOrigen, setCargandoOrigen] = useState(false);
  const [seleccionadas, setSeleccionadas] = useState<Set<string>>(new Set());
  // Cada ruta marcada puede llevar su propia observación (no una sola
  // compartida para todo el lote), igual que en "Nueva solicitud". Arranca
  // colapsada (un link "+ Agregar observación") y solo una abierta a la
  // vez — abrir otra colapsa la anterior — mismo criterio que allá, para
  // no llenar la pantalla de inputs si se marcan varias rutas seguidas.
  const [observacionesPorId, setObservacionesPorId] = useState<Record<string, string>>({});
  const [observacionAbiertaId, setObservacionAbiertaId] = useState<string | null>(null);
  const alternarObservacion = (id: string) => {
    setObservacionAbiertaId((prev) => (prev === id ? null : id));
  };
  const [copiando, setCopiando] = useState(false);
  const [error, setError] = useState("");
  const peticionDiaRef = useRef(0);
  // Confirmación que queda FIJA en pantalla después de copiar (no un toast
  // que se puede perder de vista) — algunos colaboradores, al no ver el
  // resultado reflejado todavía en "Mis Pasajes" al navegar para allá
  // (la lista tarda un poco en refrescarse), volvían a copiar 2-3 veces
  // pensando que no había funcionado. Con esto queda clarísimo que sí.
  const [ultimaCopia, setUltimaCopia] = useState<{ cantidad: number; fecha: string } | null>(null);

  const fechaMinima = useMemo(() => {
    const limite = new Date();
    limite.setDate(limite.getDate() - 2);
    const y = limite.getFullYear();
    const m = String(limite.getMonth() + 1).padStart(2, "0");
    const d = String(limite.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, []);

  const cambiarFechaOrigen = async (valor: string) => {
    setFechaOrigen(valor);
    setSeleccionadas(new Set());
    setObservacionesPorId({});
    setObservacionAbiertaId(null);
    setUltimaCopia(null);
    if (!valor) {
      setSolicitudesOrigen([]);
      return;
    }
    const idPeticion = ++peticionDiaRef.current;
    setCargandoOrigen(true);
    try {
      const res = await fetch(`/api/solicitudes/por-dia?fecha=${valor}`);
      if (idPeticion !== peticionDiaRef.current) return;
      setSolicitudesOrigen(res.ok ? await res.json() : []);
    } catch {
      if (idPeticion === peticionDiaRef.current) {
        toast.error("No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.");
      }
    } finally {
      if (idPeticion === peticionDiaRef.current) setCargandoOrigen(false);
    }
  };

  // Ambas fechas ya arrancan en "hoy" (useState de arriba); acá solo falta
  // traer la lista de solicitudes de ese día para que no se vea vacía. Se
  // hace el fetch directo (no llamando a cambiarFechaOrigen) para que el
  // cuerpo del effect no dispare ningún setState de forma sincrónica.
  useEffect(() => {
    let cancelado = false;
    (async () => {
      setCargandoOrigen(true);
      try {
        const res = await fetch(`/api/solicitudes/por-dia?fecha=${fechaOrigen}`);
        if (!cancelado) setSolicitudesOrigen(res.ok ? await res.json() : []);
      } catch {
        if (!cancelado) toast.error("No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.");
      } finally {
        if (!cancelado) setCargandoOrigen(false);
      }
    })();
    return () => { cancelado = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const alternarSeleccion = (id: string) => {
    setSeleccionadas((prev) => {
      const copia = new Set(prev);
      if (copia.has(id)) copia.delete(id);
      else copia.add(id);
      return copia;
    });
  };

  const todasSeleccionadas = solicitudesOrigen.length > 0 && solicitudesOrigen.every((s) => seleccionadas.has(s.id));

  const alternarSeleccionarTodas = () => {
    setSeleccionadas(todasSeleccionadas ? new Set() : new Set(solicitudesOrigen.map((s) => s.id)));
  };

  const cambiarObservacion = (id: string, valor: string) => {
    setObservacionesPorId((prev) => ({ ...prev, [id]: valor }));
  };

  const confirmarCopiar = async () => {
    if (seleccionadas.size === 0 || !fechaDestino) return;
    setCopiando(true);
    setError("");
    try {
      const items = Array.from(seleccionadas).map((id) => ({ id, observaciones: observacionesPorId[id] ?? "" }));
      const res = await fetch("/api/solicitudes/copiar-lote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items, fecha: fechaDestino }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "No se pudieron copiar las rutas");
        toast.error(data.error ?? "No se pudieron copiar las rutas");
        return;
      }
      const data = await res.json();
      toast.exito(`${data.copiadas} ${data.copiadas === 1 ? "ruta copiada" : "rutas copiadas"} a ${formatearFecha(fechaDestino)}`);
      setUltimaCopia({ cantidad: data.copiadas, fecha: fechaDestino });
      setFechaOrigen("");
      setFechaDestino("");
      setSolicitudesOrigen([]);
      setSeleccionadas(new Set());
      setObservacionesPorId({});
      setObservacionAbiertaId(null);
      router.refresh();
    } catch {
      setError("No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.");
      toast.error("No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setCopiando(false);
    }
  };

  return (
    <div className="flex-1 px-4 sm:px-8 py-5 space-y-4">
      <div className="flex flex-wrap items-baseline gap-2">
        <h1 className="text-lg sm:text-xl font-bold">Copiar rutas</h1>
        <span className="hidden sm:inline text-xs text-neutral-500 dark:text-neutral-400">
          · Elige el día del que quieres copiar, marca las rutas y a qué día se repiten
        </span>
      </div>

      {/* Queda fija en pantalla (no es un toast que desaparece solo) para
          que quede clarísimo que ya se copió, aunque la lista de "Mis
          Pasajes" tarde un poco en reflejarlo al navegar para allá — sin
          esto, algunos volvían a copiar 2-3 veces pensando que no había
          funcionado. */}
      {ultimaCopia && (
        <div className="max-w-2xl bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-green-500 text-white flex items-center justify-center shrink-0">
            <IconoCheck className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-green-800 dark:text-green-300">
              Ya se copiaron {ultimaCopia.cantidad} {ultimaCopia.cantidad === 1 ? "ruta" : "rutas"} a {formatearFecha(ultimaCopia.fecha)}
            </p>
            <p className="text-xs text-green-700/80 dark:text-green-400/80">No hace falta volver a copiarlas.</p>
          </div>
          <a
            href="/mis-pasajes"
            className="shrink-0 text-xs font-semibold text-green-800 dark:text-green-300 border border-green-300 dark:border-green-500/30 hover:bg-green-100 dark:hover:bg-green-500/10 px-3 py-2 rounded-lg transition"
          >
            Ver en Mis Pasajes
          </a>
        </div>
      )}

      <div className="bg-neutral-50 dark:bg-neutral-900 rounded-2xl p-5 shadow-sm ring-1 ring-black/5 dark:ring-white/10 space-y-4 max-w-2xl">
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Día de origen</label>
          <div className="mt-1.5"><CalendarioSelector value={fechaOrigen} onChange={cambiarFechaOrigen} /></div>
        </div>

        {fechaOrigen && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                Rutas de ese día{solicitudesOrigen.length > 0 && ` (${solicitudesOrigen.length})`}
              </label>
              {solicitudesOrigen.length > 0 && (
                <button
                  type="button"
                  onClick={alternarSeleccionarTodas}
                  className="text-xs font-medium text-orange-600 hover:text-orange-700"
                >
                  {todasSeleccionadas ? "Ninguna" : "Todas"}
                </button>
              )}
            </div>
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl divide-y divide-neutral-100 dark:divide-neutral-800 max-h-72 overflow-y-auto">
              {cargandoOrigen ? (
                <div className="flex items-center gap-2 px-3.5 py-4 text-sm text-neutral-400 dark:text-neutral-500">
                  <Spinner className="w-4 h-4" /> Buscando...
                </div>
              ) : solicitudesOrigen.length === 0 ? (
                <p className="px-3.5 py-4 text-sm text-neutral-400 dark:text-neutral-500 text-center">Sin solicitudes registradas ese día</p>
              ) : (
                solicitudesOrigen.map((s) => {
                  const marcada = seleccionadas.has(s.id);
                  const valorObservacion = observacionesPorId[s.id] ?? "";
                  const observacionAbierta = observacionAbiertaId === s.id;
                  return (
                    <div key={s.id} className={marcada ? "bg-orange-50/60 dark:bg-orange-500/5" : ""}>
                      <div className="flex items-center gap-2.5 px-3.5 py-2.5 text-sm">
                        <label className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={marcada}
                            onChange={() => alternarSeleccion(s.id)}
                            className="w-4 h-4 accent-orange-500 rounded shrink-0"
                          />
                          <AvatarRuta nombre={s.rutaLabel} valor={s.valor} className="w-7 h-7 shrink-0" />
                          <span className="flex-1 min-w-0 truncate">
                            {esSupervisor && <span className="font-medium">{s.nombreColaborador} · </span>}
                            {s.rutaLabel}
                          </span>
                        </label>
                        <span className="text-neutral-500 dark:text-neutral-400 shrink-0">{formatearMoneda(s.valor)}</span>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                            ESTILOS_ESTADO[s.estado] ?? "bg-neutral-100 text-neutral-600"
                          }`}
                        >
                          {s.estado}
                        </span>
                        {marcada && (
                          <button
                            type="button"
                            onClick={() => alternarObservacion(s.id)}
                            title="Observación para esta ruta"
                            className="flex items-center gap-1 p-1 -mr-1 rounded-lg text-neutral-400 dark:text-neutral-500 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-500/10 transition shrink-0"
                          >
                            {valorObservacion && <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0" />}
                            <IconoChevron className={`w-3.5 h-3.5 transition-transform ${observacionAbierta ? "rotate-90" : ""}`} />
                          </button>
                        )}
                      </div>
                      {marcada && observacionAbierta && (
                        <div className="pl-[78px] pr-3.5 pb-2.5">
                          <input
                            autoFocus
                            value={valorObservacion}
                            onChange={(e) => cambiarObservacion(s.id, e.target.value.toUpperCase())}
                            placeholder="Observación para esta ruta (opcional)"
                            className="w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 px-2.5 py-1.5 text-xs focus:border-orange-400 focus:ring-2 focus:ring-orange-500/15 outline-none"
                          />
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Día de destino</label>
          <div className="mt-1.5"><CalendarioSelector value={fechaDestino} onChange={setFechaDestino} fechaMinima={fechaMinima} /></div>
          {fechaDestino && fechaDestino === fechaOrigen && (
            <p className="text-xs text-amber-600 mt-1">El día de destino no puede ser igual al de origen.</p>
          )}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end">
          <button
            type="button"
            disabled={seleccionadas.size === 0 || !fechaDestino || fechaDestino === fechaOrigen || copiando}
            onClick={confirmarCopiar}
            title={
              seleccionadas.size === 0
                ? "Elegir al menos una ruta para copiar"
                : !fechaDestino
                ? "Elegir un día de destino"
                : fechaDestino === fechaOrigen
                ? "El día de destino no puede ser igual al de origen"
                : undefined
            }
            className="px-5 py-2.5 text-sm font-semibold bg-orange-500 hover:bg-orange-600 text-white rounded-xl disabled:opacity-40 transition shadow-sm hover:shadow-md flex items-center gap-2"
          >
            {copiando && <Spinner className="w-4 h-4" />}
            {copiando ? "Copiando..." : `Copiar${seleccionadas.size > 0 ? ` (${seleccionadas.size})` : ""}`}
          </button>
        </div>
      </div>
    </div>
  );
}
