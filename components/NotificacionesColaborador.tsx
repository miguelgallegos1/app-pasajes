// components/NotificacionesColaborador.tsx
// Campanita del header para el colaborador: avisa cuando alguna de SUS
// solicitudes quedó Aprobada o Rechazada. No hay una única "alerta" como
// en TH/Coordinación/Nómina (NotificacionesMenu) — acá es una lista corta
// de resueltas recientes, y lo "nuevo" se calcula comparando contra los
// ids ya vistos (guardados en localStorage: no hace falta tocar la base
// para esto, y alcanza con que funcione por dispositivo).

"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { IconoCampana, IconoCheck, IconoDevolver } from "./Icons";
import { formatearFecha } from "../lib/fechas";

type ItemResuelto = {
  id: string;
  codigo: string;
  estado: "APROBADA" | "RECHAZADA";
  rutaLabel: string;
  fecha: string;
  quien: string | null;
  nombreColaborador: string | null;
};

const CLAVE_VISTOS = "app-pasajes:notificaciones-vistas";

function leerVistos(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const guardado = localStorage.getItem(CLAVE_VISTOS);
    return guardado ? new Set(JSON.parse(guardado)) : new Set();
  } catch {
    return new Set();
  }
}

function guardarVistos(ids: Set<string>) {
  try {
    localStorage.setItem(CLAVE_VISTOS, JSON.stringify(Array.from(ids)));
  } catch {
    // Sin localStorage (privado/bloqueado): simplemente no se recuerda
    // entre visitas — no rompe nada, solo vuelve a marcar "nuevo" seguido.
  }
}

export default function NotificacionesColaborador() {
  const [items, setItems] = useState<ItemResuelto[]>([]);
  const [vistos, setVistos] = useState<Set<string>>(leerVistos);
  const [abierto, setAbierto] = useState(false);
  const contenedorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelado = false;
    const cargar = () => {
      fetch("/api/mis-pasajes/notificaciones")
        .then((res) => (res.ok ? res.json() : null))
        .then((data: { items: ItemResuelto[] } | null) => {
          if (!cancelado && data) setItems(data.items);
        })
        .catch(() => {});
    };
    cargar();

    // Se vuelve a pedir cuando el service worker avisa que llegó un push
    // (un cambio de estado real) — nunca por foco/clics, para no gastar
    // consultas a la base sin necesidad. Como respaldo, también se vuelve
    // a pedir al volver a primer plano: en el celular, con la app en
    // segundo plano (o recién retomada tras estar suspendida por el
    // sistema para ahorrar batería), el aviso del service worker puede no
    // llegar a tiempo — así, apenas se vuelve a abrir la app, se pone al
    // día de una sola vez, sin esperar otro push.
    function manejarMensaje(e: MessageEvent) {
      if (e.data?.type === "push-recibido") cargar();
    }
    function manejarVisibilidad() {
      if (document.visibilityState === "visible") cargar();
    }
    navigator.serviceWorker?.addEventListener("message", manejarMensaje);
    document.addEventListener("visibilitychange", manejarVisibilidad);
    return () => {
      cancelado = true;
      navigator.serviceWorker?.removeEventListener("message", manejarMensaje);
      document.removeEventListener("visibilitychange", manejarVisibilidad);
    };
  }, []);

  useEffect(() => {
    function manejarClickAfuera(e: MouseEvent) {
      if (contenedorRef.current && !contenedorRef.current.contains(e.target as Node)) setAbierto(false);
    }
    function manejarEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setAbierto(false);
    }
    document.addEventListener("mousedown", manejarClickAfuera);
    document.addEventListener("keydown", manejarEscape);
    return () => {
      document.removeEventListener("mousedown", manejarClickAfuera);
      document.removeEventListener("keydown", manejarEscape);
    };
  }, []);

  const nuevos = items.filter((it) => !vistos.has(it.id));
  const hayNuevos = nuevos.length > 0;

  const alternar = () => {
    setAbierto((a) => !a);
    // Al abrir, todo lo que se está mostrando ahora queda marcado como
    // visto — la próxima resuelta que llegue sí va a volver a avisar.
    if (!abierto && items.length > 0) {
      const todos = new Set(vistos);
      items.forEach((it) => todos.add(it.id));
      setVistos(todos);
      guardarVistos(todos);
    }
  };

  return (
    <div className="relative" ref={contenedorRef}>
      <button
        onClick={alternar}
        title="Notificaciones"
        aria-label={hayNuevos ? "Notificaciones (hay novedades)" : "Notificaciones"}
        aria-haspopup="true"
        aria-expanded={abierto}
        className="relative text-neutral-500 hover:text-orange-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:text-orange-400 dark:hover:bg-neutral-800 p-2 rounded-lg transition"
      >
        <IconoCampana className="w-[18px] h-[18px]" />
        {hayNuevos && (
          <span className="absolute top-1 right-1 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
          </span>
        )}
      </button>

      {abierto && (
        <div className="fixed left-1/2 -translate-x-1/2 top-16 w-[calc(100vw-2rem)] max-w-xs sm:absolute sm:left-auto sm:translate-x-0 sm:top-auto sm:right-0 sm:mt-2 sm:w-72 sm:max-w-none bg-white dark:bg-neutral-900 ring-1 ring-black/5 dark:ring-white/10 rounded-2xl shadow-2xl overflow-hidden origin-top animate-[dropdown-in_0.15s_ease-out] z-40">
          {items.length === 0 ? (
            <p className="px-4 py-8 text-sm text-neutral-400 dark:text-neutral-500 text-center">
              Nada resuelto todavía.
            </p>
          ) : (
            <div className="max-h-80 overflow-y-auto divide-y divide-neutral-100 dark:divide-neutral-800">
              {items.map((it) => {
                const aprobada = it.estado === "APROBADA";
                return (
                  <div key={it.id} className="flex items-start gap-2.5 px-4 py-3">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                        aprobada
                          ? "bg-green-100 text-green-600 dark:bg-green-500/20 dark:text-green-400"
                          : "bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400"
                      }`}
                    >
                      {aprobada ? <IconoCheck className="w-4 h-4" /> : <IconoDevolver className="w-4 h-4" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-neutral-800 dark:text-neutral-200">
                        <span className="font-mono font-semibold">{it.codigo}</span>{" "}
                        {aprobada ? "fue aprobada" : "fue rechazada"}
                      </p>
                      {it.nombreColaborador && (
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">{it.nombreColaborador}</p>
                      )}
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                        {it.rutaLabel} · {formatearFecha(it.fecha)}
                      </p>
                      {it.quien && (
                        <p className="text-xs text-neutral-400 dark:text-neutral-500 truncate">Por {it.quien}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <Link
            href="/mis-pasajes"
            onClick={() => setAbierto(false)}
            className="block text-center text-xs font-semibold px-3 py-2.5 border-t border-neutral-100 dark:border-neutral-800 text-neutral-500 dark:text-neutral-400 hover:text-orange-600 dark:hover:text-orange-400 transition"
          >
            Ver Mis Pasajes
          </Link>
        </div>
      )}
    </div>
  );
}
