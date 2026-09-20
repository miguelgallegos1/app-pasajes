// components/CommandPalette.tsx
// Paleta de comandos (Ctrl/Cmd+K): salta a cualquier pantalla del menú sin
// tocar el mouse. Se monta una sola vez en AppShell con la lista ya
// aplanada (ítems sueltos + los que están dentro de cada grupo). Si el rol
// puede ver el CRUD de colaboradores, además busca colaboradores por
// nombre/código a medida que se escribe (mismo alcance que esa pantalla).

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { IconoLupa, IconoPersonas } from "./Icons";

export type ItemPaleta = { label: string; href: string; grupo?: string; icono: (props: { className?: string }) => React.ReactElement };
type ResultadoColaborador = { id: string; label: string; sublabel: string };

const ROLES_CON_BUSQUEDA_COLABORADORES = new Set(["ADMIN_TH", "SUPER_ADMIN"]);

type ItemCombinado =
  | { tipo: "nav"; clave: string; item: ItemPaleta }
  | { tipo: "colaborador"; clave: string; item: ResultadoColaborador };

export default function CommandPalette({
  items,
  rol,
  onCerrar,
}: {
  items: ItemPaleta[];
  rol: string;
  onCerrar: () => void;
}) {
  const [busqueda, setBusqueda] = useState("");
  const [activo, setActivo] = useState(0);
  const [colaboradores, setColaboradores] = useState<ResultadoColaborador[]>([]);
  const [buscandoColaboradores, setBuscandoColaboradores] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  // onCerrar suele llegar como función inline desde AppShell: si el efecto
  // de abajo dependiera de ella directamente, cualquier re-render del padre
  // reinstalaría el listener (mismo patrón de fragilidad que tenía Modal.tsx).
  const onCerrarRef = useRef(onCerrar);
  useEffect(() => {
    onCerrarRef.current = onCerrar;
  }, [onCerrar]);

  useEffect(() => {
    const alPresionar = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCerrarRef.current();
    };
    window.addEventListener("keydown", alPresionar);
    return () => window.removeEventListener("keydown", alPresionar);
  }, []);

  useEffect(() => {
    const id = setTimeout(() => inputRef.current?.focus(), 10);
    return () => clearTimeout(id);
  }, []);

  const puedeBuscarColaboradores = ROLES_CON_BUSQUEDA_COLABORADORES.has(rol);

  // Búsqueda de colaboradores con "debounce": espera una pausa al tipear
  // antes de pedir al servidor, y descarta la respuesta si ya se escribió
  // otra cosa mientras tanto (evita que una respuesta lenta y vieja
  // pise a una más nueva y rápida).
  useEffect(() => {
    const texto = busqueda.trim();
    const controlador = new AbortController();
    const id = setTimeout(() => {
      if (!puedeBuscarColaboradores || texto.length < 2) {
        setColaboradores([]);
        setBuscandoColaboradores(false);
        return;
      }
      setBuscandoColaboradores(true);
      fetch(`/api/colaboradores/buscar?q=${encodeURIComponent(texto)}`, { signal: controlador.signal })
        .then((res) => (res.ok ? res.json() : { resultados: [] }))
        .then((data) => setColaboradores(data.resultados ?? []))
        .catch(() => {})
        .finally(() => setBuscandoColaboradores(false));
    }, 250);
    return () => {
      clearTimeout(id);
      controlador.abort();
    };
  }, [busqueda, puedeBuscarColaboradores]);

  const resultadosNav = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    if (!texto) return items;
    return items.filter(
      (i) => i.label.toLowerCase().includes(texto) || (i.grupo ?? "").toLowerCase().includes(texto)
    );
  }, [items, busqueda]);

  const resultados: ItemCombinado[] = useMemo(
    () => [
      ...resultadosNav.map((item): ItemCombinado => ({ tipo: "nav", clave: `nav:${item.href}`, item })),
      ...colaboradores.map((item): ItemCombinado => ({ tipo: "colaborador", clave: `col:${item.id}`, item })),
    ],
    [resultadosNav, colaboradores]
  );

  const ir = (resultado: ItemCombinado) => {
    onCerrar();
    if (resultado.tipo === "nav") router.push(resultado.item.href);
    else router.push(`/th/colaboradores?q=${encodeURIComponent(resultado.item.label)}`);
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center pt-[12vh] px-4 bg-black/40 backdrop-blur-sm animate-[overlay-in_0.15s_ease-out]"
      onClick={onCerrar}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-lg bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl ring-1 ring-black/10 dark:ring-white/10 overflow-hidden animate-[panel-in_0.25s_cubic-bezier(0.16,1,0.3,1)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">
          <IconoLupa className="w-4 h-4 text-neutral-400 dark:text-neutral-500 shrink-0" />
          <input
            ref={inputRef}
            value={busqueda}
            onChange={(e) => { setBusqueda(e.target.value); setActivo(0); }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") { e.preventDefault(); setActivo((a) => Math.min(a + 1, resultados.length - 1)); }
              else if (e.key === "ArrowUp") { e.preventDefault(); setActivo((a) => Math.max(a - 1, 0)); }
              else if (e.key === "Enter" && resultados[activo]) { ir(resultados[activo]); }
            }}
            placeholder={puedeBuscarColaboradores ? "Buscar una pantalla o un colaborador..." : "Buscar una pantalla..."}
            className="flex-1 bg-transparent outline-none text-sm placeholder:text-neutral-400"
          />
          <kbd className="hidden sm:inline text-[10px] font-semibold text-neutral-400 dark:text-neutral-500 border border-neutral-300 dark:border-neutral-700 rounded px-1.5 py-0.5">Esc</kbd>
        </div>

        <div className="max-h-80 overflow-y-auto p-1.5 space-y-0.5">
          {resultados.length === 0 && !buscandoColaboradores && (
            <p className="px-4 py-6 text-center text-sm text-neutral-400 dark:text-neutral-500">Sin resultados</p>
          )}
          {resultados.map((resultado, i) => {
            if (resultado.tipo === "nav") {
              const Icono = resultado.item.icono;
              return (
                <button
                  key={resultado.clave}
                  type="button"
                  onClick={() => ir(resultado)}
                  onMouseEnter={() => setActivo(i)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm transition ${
                    i === activo
                      ? "bg-orange-500/10 text-orange-700 font-medium dark:bg-orange-500/15 dark:text-orange-400"
                      : "text-neutral-700 dark:text-neutral-300"
                  }`}
                >
                  <Icono className={`w-4 h-4 shrink-0 ${i === activo ? "text-orange-600 dark:text-orange-400" : "text-neutral-400 dark:text-neutral-500"}`} />
                  <span className="flex-1 truncate">{resultado.item.label}</span>
                  {resultado.item.grupo && (
                    <span className={`text-xs shrink-0 ${i === activo ? "text-orange-600/70 dark:text-orange-400/70" : "text-neutral-400 dark:text-neutral-500"}`}>
                      {resultado.item.grupo}
                    </span>
                  )}
                </button>
              );
            }
            return (
              <button
                key={resultado.clave}
                type="button"
                onClick={() => ir(resultado)}
                onMouseEnter={() => setActivo(i)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm transition ${
                  i === activo
                    ? "bg-orange-500/10 text-orange-700 font-medium dark:bg-orange-500/15 dark:text-orange-400"
                    : "text-neutral-700 dark:text-neutral-300"
                }`}
              >
                <IconoPersonas className={`w-4 h-4 shrink-0 ${i === activo ? "text-orange-600 dark:text-orange-400" : "text-neutral-400 dark:text-neutral-500"}`} />
                <span className="flex-1 truncate">{resultado.item.label}</span>
                <span className={`text-xs shrink-0 ${i === activo ? "text-orange-600/70 dark:text-orange-400/70" : "text-neutral-400 dark:text-neutral-500"}`}>
                  {resultado.item.sublabel}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
