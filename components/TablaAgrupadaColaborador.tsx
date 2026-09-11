// components/TablaAgrupadaColaborador.tsx
// Tabla de 3 niveles: Colaborador (total de rutas + valor) -> Ruta
// (subtotal) -> solicitudes puntuales. Cada nivel se expande bajo demanda.
// Reusado por Coordinador y Nómina, tanto en sus colas de acción (datos
// ya cargados en memoria) como en sus historiales (datos pedidos al
// backend al expandir, para no traer todo el historial de una vez).

"use client";

import { useState, useRef } from "react";
import Spinner from "./Spinner";
import { IconoChevron } from "./Icons";

export type FilaResumen = { id: string; nombre: string; cantidad: number; total: number };

type Props<TDetalle> = {
  filas: FilaResumen[];
  cargarSubfilas: (colaboradorId: string) => Promise<FilaResumen[]> | FilaResumen[];
  cargarDetalle: (colaboradorId: string, rutaId: string) => Promise<TDetalle[]> | TDetalle[];
  renderDetalle: (item: TDetalle) => React.ReactNode;
  vacio?: string;
};

export default function TablaAgrupadaColaborador<TDetalle>({
  filas,
  cargarSubfilas,
  cargarDetalle,
  renderDetalle,
  vacio = "Sin resultados con esos filtros",
}: Props<TDetalle>) {
  const [colaboradorAbierto, setColaboradorAbierto] = useState<string | null>(null);
  const [subfilas, setSubfilas] = useState<FilaResumen[]>([]);
  const [cargandoSubfilas, setCargandoSubfilas] = useState(false);
  const peticionColaboradorRef = useRef(0);

  const [rutaAbierta, setRutaAbierta] = useState<string | null>(null);
  const [detalle, setDetalle] = useState<TDetalle[]>([]);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const peticionRutaRef = useRef(0);

  const alternarColaborador = async (colaboradorId: string) => {
    setRutaAbierta(null);
    if (colaboradorAbierto === colaboradorId) {
      setColaboradorAbierto(null);
      return;
    }
    setColaboradorAbierto(colaboradorId);
    const idPeticion = ++peticionColaboradorRef.current;
    setCargandoSubfilas(true);
    try {
      const resultado = await cargarSubfilas(colaboradorId);
      if (idPeticion !== peticionColaboradorRef.current) return; // llegó una más nueva antes
      setSubfilas(resultado);
    } finally {
      if (idPeticion === peticionColaboradorRef.current) setCargandoSubfilas(false);
    }
  };

  const alternarRuta = async (rutaId: string) => {
    if (!colaboradorAbierto) return;
    if (rutaAbierta === rutaId) {
      setRutaAbierta(null);
      return;
    }
    setRutaAbierta(rutaId);
    const idPeticion = ++peticionRutaRef.current;
    setCargandoDetalle(true);
    try {
      const resultado = await cargarDetalle(colaboradorAbierto, rutaId);
      if (idPeticion !== peticionRutaRef.current) return;
      setDetalle(resultado);
    } finally {
      if (idPeticion === peticionRutaRef.current) setCargandoDetalle(false);
    }
  };

  if (filas.length === 0) {
    return <p className="px-4 py-10 text-center text-neutral-400 text-sm">{vacio}</p>;
  }

  return (
    <div className="divide-y divide-neutral-200/70">
      {filas.map((colaborador) => {
        const abierto = colaboradorAbierto === colaborador.id;
        return (
          <div key={colaborador.id}>
            <button
              type="button"
              onClick={() => alternarColaborador(colaborador.id)}
              className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-neutral-100/60 transition"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <IconoChevron className={`w-4 h-4 text-neutral-400 shrink-0 transition-transform ${abierto ? "rotate-90" : ""}`} />
                <span className="font-medium truncate">{colaborador.nombre}</span>
              </div>
              <div className="flex items-center gap-4 shrink-0 text-sm">
                <span className="text-neutral-500">{colaborador.cantidad} {colaborador.cantidad === 1 ? "ruta" : "rutas"}</span>
                <span className="font-semibold text-neutral-800">${colaborador.total.toFixed(2)}</span>
              </div>
            </button>

            {abierto && (
              <div className="bg-neutral-50/80 pl-8 pr-2 pb-2">
                {cargandoSubfilas ? (
                  <div className="flex items-center gap-2 py-3 text-sm text-neutral-400">
                    <Spinner className="w-4 h-4" /> Cargando rutas...
                  </div>
                ) : subfilas.length === 0 ? (
                  <p className="py-3 text-sm text-neutral-400">Sin rutas en este rango</p>
                ) : (
                  <div className="divide-y divide-neutral-200/70">
                    {subfilas.map((ruta) => {
                      const rutaOpen = rutaAbierta === ruta.id;
                      return (
                        <div key={ruta.id}>
                          <button
                            type="button"
                            onClick={() => alternarRuta(ruta.id)}
                            className="w-full flex items-center justify-between gap-3 py-2.5 text-left hover:bg-neutral-100/60 transition rounded-lg px-2"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <IconoChevron className={`w-3.5 h-3.5 text-neutral-400 shrink-0 transition-transform ${rutaOpen ? "rotate-90" : ""}`} />
                              <span className="text-sm truncate">{ruta.nombre}</span>
                            </div>
                            <div className="flex items-center gap-3 shrink-0 text-xs">
                              <span className="text-neutral-400">{ruta.cantidad}</span>
                              <span className="font-medium text-neutral-700">${ruta.total.toFixed(2)}</span>
                            </div>
                          </button>

                          {rutaOpen && (
                            <div className="pl-5 pb-2">
                              {cargandoDetalle ? (
                                <div className="flex items-center gap-2 py-2 text-xs text-neutral-400">
                                  <Spinner className="w-3.5 h-3.5" /> Cargando solicitudes...
                                </div>
                              ) : detalle.length === 0 ? (
                                <p className="py-2 text-xs text-neutral-400">Sin solicitudes</p>
                              ) : (
                                <div className="space-y-1.5 py-1">{detalle.map((item) => renderDetalle(item))}</div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
