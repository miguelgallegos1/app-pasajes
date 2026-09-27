// components/BuscadorFichaColaborador.tsx
// Elegir la ficha de colaborador de un usuario administrativo (Admin ->
// Usuarios): buscador por nombre o código de nómina que reutiliza
// /api/colaboradores/buscar (búsqueda indexada, máximo 8 resultados). Solo
// consulta cuando se escriben 2+ letras, con una pequeña espera entre
// teclas para no pedir en cada una.

"use client";

import { useEffect, useState } from "react";
import { IconoX } from "./Icons";

export type Ficha = { id: string; label: string };
type Resultado = { id: string; label: string; sublabel: string };

export default function BuscadorFichaColaborador({ valor, onCambiar }: { valor: Ficha | null; onCambiar: (f: Ficha | null) => void }) {
  const [texto, setTexto] = useState("");
  const [resultados, setResultados] = useState<Resultado[]>([]);
  const [buscando, setBuscando] = useState(false);

  useEffect(() => {
    const q = texto.trim();
    if (q.length < 2) return;
    const controlador = new AbortController();
    const espera = setTimeout(() => {
      setBuscando(true);
      fetch(`/api/colaboradores/buscar?q=${encodeURIComponent(q)}`, { signal: controlador.signal })
        .then((res) => (res.ok ? res.json() : { resultados: [] }))
        .then((data: { resultados: Resultado[] }) => setResultados(data.resultados))
        .catch(() => {})
        .finally(() => setBuscando(false));
    }, 250);
    return () => {
      clearTimeout(espera);
      controlador.abort();
    };
  }, [texto]);

  if (valor) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-3.5 py-2.5 text-sm">
        <span className="truncate font-medium">{valor.label}</span>
        <button
          type="button"
          onClick={() => onCambiar(null)}
          title="Quitar vínculo"
          className="shrink-0 rounded-lg p-1 text-neutral-400 hover:text-red-600 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition"
        >
          <IconoX className="w-4 h-4" />
        </button>
      </div>
    );
  }

  const mostrarResultados = texto.trim().length >= 2;
  return (
    <div className="relative">
      <input
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder="Buscar por nombre o código de nómina..."
        className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white px-3.5 py-2.5 text-sm focus:border-orange-400 focus:ring-2 focus:ring-orange-500/15 outline-none"
      />
      {mostrarResultados && (
        <div className="mt-1 rounded-xl ring-1 ring-black/5 dark:ring-white/10 bg-white dark:bg-neutral-900 shadow-lg overflow-hidden">
          {buscando && resultados.length === 0 ? (
            <p className="px-3.5 py-2.5 text-xs text-neutral-400">Buscando...</p>
          ) : resultados.length === 0 ? (
            <p className="px-3.5 py-2.5 text-xs text-neutral-400">Sin resultados</p>
          ) : (
            resultados.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => {
                  onCambiar({ id: r.id, label: `${r.label} (${r.sublabel})` });
                  setTexto("");
                  setResultados([]);
                }}
                className="w-full text-left px-3.5 py-2 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800 transition"
              >
                <span className="font-medium">{r.label}</span>
                <span className="ml-2 text-xs text-neutral-400">{r.sublabel}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
