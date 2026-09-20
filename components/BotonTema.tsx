// components/BotonTema.tsx
// Botón sol/luna para forzar el tema claro u oscuro. Reutilizable en el
// header de la app y en la pantalla de login.

"use client";

import { useEffect, useState } from "react";
import { useTema } from "./ThemeProvider";
import { IconoSol, IconoLuna } from "./Icons";

export default function BotonTema({ className = "" }: { className?: string }) {
  const { tema, alternarTema } = useTema();
  // El tema real depende del <html class="dark">, que en el cliente puede
  // no coincidir con lo que el servidor renderizó a ciegas. Hasta que el
  // componente se monta (y React ya reconcilió con el DOM real) mostramos
  // un ícono neutro para no arriesgar un parpadeo entre sol y luna.
  const [montado, setMontado] = useState(false);
  // No puede resolverse en el initializer: el servidor siempre arranca en
  // "false" (no conoce el tema real) y el cliente debe hidratar igual,
  // recién después corrige — si arrancara ya en "true" en el cliente,
  // el ícono no coincidiría con lo que pintó el servidor.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMontado(true), []);

  return (
    <button
      onClick={alternarTema}
      title={montado && tema === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      className={`p-2 rounded-lg transition text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:text-white dark:hover:bg-neutral-800 ${className}`}
    >
      {montado && tema === "dark" ? <IconoSol className="w-4 h-4" /> : <IconoLuna className="w-4 h-4" />}
    </button>
  );
}
