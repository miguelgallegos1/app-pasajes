// components/CampoPin.tsx
// Campo de solo lectura con el PIN generado (ver lib/usePin.ts) y botones
// para copiarlo y generar otro. Opcionalmente con "Cancelar" (al resetear
// el PIN de alguien ya creado).

"use client";

import type { ReactNode } from "react";
import type { usePin } from "../lib/usePin";
import { IconoCheck, IconoCopiar, IconoRefrescar } from "./Icons";

const BOTON =
  "shrink-0 w-11 flex items-center justify-center rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition disabled:opacity-40";

export default function CampoPin({
  pin,
  etiqueta,
  ayuda,
  advertencia = false,
  onCancelar,
}: {
  pin: ReturnType<typeof usePin>;
  etiqueta: string;
  ayuda: ReactNode;
  // Ayuda en ámbar (ej. "el PIN anterior deja de funcionar").
  advertencia?: boolean;
  onCancelar?: () => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">{etiqueta}</label>
        {onCancelar && (
          <button type="button" onClick={onCancelar} className="text-xs text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300 transition">
            Cancelar
          </button>
        )}
      </div>
      <div className="mt-1.5 flex gap-1.5">
        <input
          value={pin.generando ? "" : pin.pin}
          readOnly
          placeholder={pin.generando ? "Generando..." : "······"}
          className="flex-1 min-w-0 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-3.5 py-3 text-lg font-bold tracking-[0.4em] text-neutral-900 dark:text-white outline-none"
        />
        <button type="button" onClick={pin.copiar} disabled={!pin.pin || pin.generando} title="Copiar PIN" className={BOTON}>
          {pin.copiado ? <IconoCheck className="w-4 h-4" /> : <IconoCopiar className="w-4 h-4" />}
        </button>
        <button type="button" onClick={pin.generar} disabled={pin.generando} title="Generar otro PIN" className={BOTON}>
          <IconoRefrescar className="w-4 h-4" />
        </button>
      </div>
      <p className={`text-xs mt-1 ${advertencia ? "text-amber-600 dark:text-amber-400" : "text-neutral-400 dark:text-neutral-500"}`}>{ayuda}</p>
    </div>
  );
}
