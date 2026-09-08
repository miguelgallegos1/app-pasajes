// components/AppShell.tsx
// Estructura compartida de TODAS las pantallas internas de la app:
// - Escritorio: barra lateral fija con el menú según el rol
// - Móvil: header con botón de menú tipo "hamburguesa" que abre un cajón
// El menú se arma dinámicamente según el rol del usuario logueado.

"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { APP_NOMBRE, APP_VERSION, APP_DESARROLLADOR } from "../lib/config";
import { IconoBuseta, IconoSalir, IconoCheck, IconoReloj, IconoPersonas, IconoRuta, IconoDinero, IconoEdificio, IconoUsuario, IconoGrafico } from "./Icons";

type ItemMenu = { label: string; href: string; icono: (props: { className?: string }) => React.ReactElement };

const MENU_POR_ROL: Record<string, ItemMenu[]> = {
  COLABORADOR: [{ label: "Mis Pasajes", href: "/mis-pasajes", icono: IconoBuseta }],
  ADMIN_TH: [
    { label: "Dashboard", href: "/dashboard", icono: IconoGrafico },
    { label: "Aprobaciones", href: "/th/aprobaciones", icono: IconoCheck },
    { label: "Historial", href: "/th/historial", icono: IconoReloj },
    { label: "Colaboradores", href: "/th/colaboradores", icono: IconoPersonas },
    { label: "Rutas", href: "/th/rutas", icono: IconoRuta },
  ],
  FINANZAS: [
    { label: "Dashboard", href: "/dashboard", icono: IconoGrafico },
    { label: "Pagos", href: "/finanzas/pagos", icono: IconoDinero },
    { label: "Historial", href: "/finanzas/historial", icono: IconoReloj },
  ],
  SUPER_ADMIN: [
    { label: "Dashboard", href: "/dashboard", icono: IconoGrafico },
    { label: "Aprobaciones", href: "/th/aprobaciones", icono: IconoCheck },
    { label: "Historial TH", href: "/th/historial", icono: IconoReloj },
    { label: "Colaboradores", href: "/th/colaboradores", icono: IconoPersonas },
    { label: "Rutas", href: "/th/rutas", icono: IconoRuta },
    { label: "Pagos", href: "/finanzas/pagos", icono: IconoDinero },
    { label: "Historial Pagos", href: "/finanzas/historial", icono: IconoReloj },
    { label: "Empresas", href: "/admin/empresas", icono: IconoEdificio },
    { label: "Usuarios", href: "/admin/usuarios", icono: IconoUsuario },
  ],
};

export default function AppShell({
  rol,
  nombreCompleto,
  fotoUrl,
  children,
}: {
  rol: string;
  nombreCompleto: string;
  fotoUrl?: string | null;
  children: React.ReactNode;
}) {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const items = MENU_POR_ROL[rol] ?? [];

  const iniciales = nombreCompleto
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();

  const cerrarSesion = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  const Avatar = () =>
    fotoUrl ? (
      <img src={fotoUrl} alt={nombreCompleto} className="w-8 h-8 rounded-full object-cover" />
    ) : (
      <div className="w-8 h-8 rounded-full bg-orange-500 text-black text-xs font-bold flex items-center justify-center shrink-0">
        {iniciales}
      </div>
    );

  const ItemsMenu = ({ onClickItem }: { onClickItem?: () => void }) => (
  <>
    {items.map((item) => {
      const activo = pathname === item.href;
      const Icono = item.icono;
      return (
        <Link
          key={item.href}
          href={item.href}
          onClick={onClickItem}
          className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
            activo
              ? "bg-orange-500 text-black shadow-[0_0_20px_rgba(249,115,22,0.5)]"
              : "text-neutral-300 hover:bg-neutral-900"
          }`}
        >
          <Icono className="w-4 h-4 shrink-0" />
          {item.label}
        </Link>
      );
    })}
  </>
);

  return (
    <div className="min-h-screen bg-black text-white flex">
      {/* ---------- Sidebar (solo escritorio) ---------- */}
      <aside className="hidden md:flex md:flex-col w-60 bg-neutral-950 border-r border-neutral-800 shrink-0">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-neutral-800">
        <div className="w-9 h-9 flex items-center justify-center shrink-0 rounded-lg border border-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.4)] bg-neutral-900 p-1">
          <img src="/logo.png" alt={APP_NOMBRE} className="w-full h-full object-contain" />
        </div>
          <span className="font-bold text-sm">{APP_NOMBRE}</span>
        </div>
        <nav className="flex-1 py-3 px-2 space-y-1">
          <ItemsMenu />
        </nav>
        <div className="p-3 border-t border-neutral-800 flex items-center gap-2">
          <Avatar />
          <span className="text-xs text-neutral-300 truncate flex-1">{nombreCompleto}</span>
          <button
            onClick={cerrarSesion}
            title="Cerrar sesión"
            className="text-neutral-400 hover:text-red-400 p-1.5 rounded-lg hover:bg-neutral-800 transition"
          >
            <IconoSalir className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* ---------- Contenido + header móvil ---------- */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-neutral-950 border-b border-neutral-800 sticky top-0 z-30">
          <button
              onClick={() => setMenuAbierto(true)}
              className="p-1.5 -ml-1.5 text-neutral-300 hover:text-white hover:bg-neutral-900 rounded-lg transition"
            >
            <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
            </svg>
          </button>
          <span className="font-bold text-sm">{APP_NOMBRE}</span>
          <Avatar />
        </header>

        {/* ---------- Cajón de menú (móvil) ---------- */}
        {/* ---------- Cajón de menú (móvil), siempre montado para poder animar la entrada/salida ---------- */}
        <div
          className={`fixed inset-0 z-50 md:hidden transition-opacity duration-300 ${
            menuAbierto ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
          }`}
        >
          <div className="absolute inset-0 bg-black/60" onClick={() => setMenuAbierto(false)} />
          <div
            className={`absolute left-0 top-0 bottom-0 w-64 bg-neutral-950 border-r border-neutral-800 p-4 flex flex-col
              transition-transform duration-300 ease-out
              ${menuAbierto ? "translate-x-0" : "-translate-x-full"}
            `}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="font-bold text-sm">{APP_NOMBRE}</span>
              <button
                onClick={() => setMenuAbierto(false)}
                className="text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg w-7 h-7 flex items-center justify-center text-xl leading-none transition"
              >
                ×
              </button>
            </div>
            <nav className="flex-1 space-y-1">
              <ItemsMenu onClickItem={() => setMenuAbierto(false)} />
            </nav>
            <button
              onClick={cerrarSesion}
              className="flex items-center gap-2 text-sm text-neutral-400 hover:text-red-400 hover:bg-neutral-900 rounded-lg px-3 py-2.5 transition"
            >
              <IconoSalir className="w-4 h-4" /> Cerrar sesión
            </button>
          </div>
        </div>

        <main className="flex-1 min-w-0 flex flex-col">
          <div className="flex-1">{children}</div>
          <footer className="text-center text-[11px] text-neutral-600 py-4 border-t border-neutral-900">
            Desarrollado por {APP_DESARROLLADOR} · v{APP_VERSION}
          </footer>
        </main>
      </div>
    </div>
  );
}