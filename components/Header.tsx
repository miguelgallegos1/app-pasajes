// components/Header.tsx
// Barra superior reutilizable: nombre de la app a la izquierda,
// foto + nombre del usuario y botón de cerrar sesión a la derecha.
// Se usará en TODOS los paneles (colaborador, TH, coordinador, nómina, admin).

"use client";

import { useRouter } from "next/navigation";
import { APP_NOMBRE } from "../lib/config";
import { IconoBuseta, IconoSalir } from "./Icons";

export default function Header({
  nombreCompleto,
  fotoUrl,
}: {
  nombreCompleto: string;
  fotoUrl?: string | null;
}) {
  const router = useRouter();

  const cerrarSesion = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  // Iniciales para el avatar cuando no hay foto (ej: "Juan Pérez" -> "JP")
  const iniciales = nombreCompleto
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();

  return (
    <header className="flex items-center justify-between px-4 sm:px-8 py-3 bg-neutral-950 border-b border-neutral-800 sticky top-0 z-30">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center text-black shrink-0">
          <IconoBuseta className="w-5 h-5" />
        </div>
        <span className="font-bold text-white text-sm sm:text-base">{APP_NOMBRE}</span>
      </div>

      <div className="flex items-center gap-3">
        <span className="hidden sm:block text-sm text-neutral-300">{nombreCompleto}</span>

        {fotoUrl ? (
          <img
            src={fotoUrl}
            alt={nombreCompleto}
            className="w-8 h-8 rounded-full object-cover border border-neutral-700"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-orange-500 text-black text-xs font-bold flex items-center justify-center">
            {iniciales}
          </div>
        )}

        <button
          onClick={cerrarSesion}
          title="Cerrar sesión"
          className="text-neutral-400 hover:text-red-400 transition p-1.5 rounded-lg hover:bg-neutral-800"
        >
          <IconoSalir />
        </button>
      </div>
    </header>
  );
}