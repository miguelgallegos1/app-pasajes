// components/AppShell.tsx
// Estructura compartida de TODAS las pantallas internas de la app:
// - Escritorio: barra lateral fija con el menú según el rol
// - Móvil: header con botón de menú tipo "hamburguesa" que abre un cajón
// El menú se arma dinámicamente según el rol del usuario logueado, y se
// agrupa en secciones colapsables (acordeón) para que crecer con más
// funciones no signifique una lista plana cada vez más larga.

"use client";

import { useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { APP_NOMBRE, APP_VERSION, APP_DESARROLLADOR } from "../lib/config";
import { IconoBuseta, IconoSalir, IconoHuella, IconoCheck, IconoReloj, IconoPersonas, IconoRuta, IconoDinero, IconoEdificio, IconoUsuario, IconoGrafico, IconoControl, IconoChevron } from "./Icons";

// Carga diferida: el código de WebAuthn (~16KB) solo se descarga la
// primera vez que alguien abre el modal, no en cada página de la app.
const ModalBiometria = dynamic(() => import("./ModalBiometria"), { ssr: false });

type IconoComponente = (props: { className?: string }) => React.ReactElement;
type ItemMenu = { label: string; href: string; icono: IconoComponente };
type GrupoMenu = { grupo: string; items: ItemMenu[] };
type EntradaMenu = ItemMenu | GrupoMenu;

function esGrupo(entrada: EntradaMenu): entrada is GrupoMenu {
  return "grupo" in entrada;
}

// Cada rol es una lista de ítems sueltos (ej. "Dashboard") y/o grupos
// colapsables. Agregar una función nueva a futuro es sumar un ítem dentro
// del grupo que corresponda (o crear un grupo nuevo) — no hace falta
// tocar el componente.
const MENU_POR_ROL: Record<string, EntradaMenu[]> = {
  COLABORADOR: [{ label: "Mis Pasajes", href: "/mis-pasajes", icono: IconoBuseta }],
  ADMIN_TH: [
    { label: "Dashboard", href: "/dashboard", icono: IconoGrafico },
    {
      grupo: "Talento Humano",
      items: [
        { label: "Aprobaciones", href: "/th/aprobaciones", icono: IconoCheck },
        { label: "Historial", href: "/th/historial", icono: IconoReloj },
        { label: "Colaboradores", href: "/th/colaboradores", icono: IconoPersonas },
        { label: "Rutas", href: "/th/rutas", icono: IconoRuta },
      ],
    },
  ],
  COORDINADOR: [
    { label: "Dashboard", href: "/dashboard", icono: IconoGrafico },
    {
      grupo: "Coordinación",
      items: [
        { label: "Revisión", href: "/coordinador/revision", icono: IconoCheck },
        { label: "Historial", href: "/coordinador/historial", icono: IconoReloj },
      ],
    },
  ],
  NOMINA: [
    { label: "Dashboard", href: "/dashboard", icono: IconoGrafico },
    {
      grupo: "Nómina",
      items: [
        { label: "Pagos", href: "/nomina/pagos", icono: IconoDinero },
        { label: "Historial", href: "/nomina/historial", icono: IconoReloj },
      ],
    },
  ],
  JEFE: [
    { label: "Dashboard", href: "/dashboard", icono: IconoGrafico },
    { label: "Historial General", href: "/jefe/historial", icono: IconoReloj },
  ],
  SUPER_ADMIN: [
    { label: "Dashboard", href: "/dashboard", icono: IconoGrafico },
    {
      grupo: "Talento Humano",
      items: [
        { label: "Aprobaciones", href: "/th/aprobaciones", icono: IconoCheck },
        { label: "Historial", href: "/th/historial", icono: IconoReloj },
        { label: "Colaboradores", href: "/th/colaboradores", icono: IconoPersonas },
        { label: "Rutas", href: "/th/rutas", icono: IconoRuta },
      ],
    },
    {
      grupo: "Coordinación",
      items: [
        { label: "Revisión", href: "/coordinador/revision", icono: IconoCheck },
        { label: "Historial", href: "/coordinador/historial", icono: IconoReloj },
      ],
    },
    {
      grupo: "Nómina",
      items: [
        { label: "Pagos", href: "/nomina/pagos", icono: IconoDinero },
        { label: "Historial", href: "/nomina/historial", icono: IconoReloj },
      ],
    },
    {
      grupo: "Informes",
      items: [{ label: "Historial General", href: "/jefe/historial", icono: IconoReloj }],
    },
    {
      grupo: "Administración",
      items: [
        { label: "Empresas", href: "/admin/empresas", icono: IconoEdificio },
        { label: "Usuarios", href: "/admin/usuarios", icono: IconoUsuario },
        { label: "Control de Solicitudes", href: "/admin/solicitudes", icono: IconoControl },
      ],
    },
  ],
};

// Nombre del grupo que contiene la página actual (o null si es un ítem
// suelto, o si no hay ninguno) — se usa para abrirlo solo automáticamente.
function grupoActivo(entradas: EntradaMenu[], pathname: string): string | null {
  for (const entrada of entradas) {
    if (esGrupo(entrada) && entrada.items.some((i) => i.href === pathname)) return entrada.grupo;
  }
  return null;
}

function Avatar({ fotoUrl, nombreCompleto, iniciales }: { fotoUrl?: string | null; nombreCompleto: string; iniciales: string }) {
  return fotoUrl ? (
    <img src={fotoUrl} alt={nombreCompleto} className="w-8 h-8 rounded-full object-cover" />
  ) : (
    <div className="w-8 h-8 rounded-full bg-orange-500 text-black text-xs font-bold flex items-center justify-center shrink-0">
      {iniciales}
    </div>
  );
}

function ItemLink({ item, activo, onClick }: { item: ItemMenu; activo: boolean; onClick?: () => void }) {
  const Icono = item.icono;
  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
        activo
          ? "bg-orange-500 text-black shadow-[0_0_10px_rgba(249,115,22,0.3)]"
          : "text-neutral-300 hover:bg-neutral-800/70"
      }`}
    >
      <Icono className="w-4 h-4 shrink-0" />
      {item.label}
    </Link>
  );
}

function ItemsMenu({
  entradas,
  pathname,
  gruposAbiertos,
  onAlternarGrupo,
  onClickItem,
}: {
  entradas: EntradaMenu[];
  pathname: string;
  gruposAbiertos: Set<string>;
  onAlternarGrupo: (grupo: string) => void;
  onClickItem?: () => void;
}) {
  return (
    <>
      {entradas.map((entrada) => {
        if (!esGrupo(entrada)) {
          return <ItemLink key={entrada.href} item={entrada} activo={pathname === entrada.href} onClick={onClickItem} />;
        }
        const abierto = gruposAbiertos.has(entrada.grupo);
        const tieneActivo = entrada.items.some((i) => i.href === pathname);
        return (
          <div key={entrada.grupo}>
            <button
              type="button"
              onClick={() => onAlternarGrupo(entrada.grupo)}
              className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-[11px] font-semibold uppercase tracking-wide transition ${
                tieneActivo ? "text-orange-400" : "text-neutral-500 hover:text-neutral-300"
              }`}
            >
              {entrada.grupo}
              <IconoChevron className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${abierto ? "rotate-90" : ""}`} />
            </button>
            {/* Truco de CSS grid (0fr -> 1fr) para animar a "altura automática"
                sin tener que medirla con JS: el contenido siempre está montado
                (así el navegador puede calcular su altura real), y es el propio
                grid el que la anima al abrir/cerrar. */}
            <div
              className="grid transition-[grid-template-rows] duration-200 ease-out"
              style={{ gridTemplateRows: abierto ? "1fr" : "0fr" }}
            >
              <div className="overflow-hidden">
                <div
                  className={`space-y-1 pb-1 transition-opacity duration-150 ${abierto ? "opacity-100 delay-75" : "opacity-0"}`}
                >
                  {entrada.items.map((item) => (
                    <ItemLink key={item.href} item={item} activo={pathname === item.href} onClick={onClickItem} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
}

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
  const [biometriaAbierta, setBiometriaAbierta] = useState(false);
  // Recién montamos (y con eso, descargamos) el modal la primera vez que
  // alguien lo pide — así el código de WebAuthn no viaja en cada página.
  const [biometriaMontada, setBiometriaMontada] = useState(false);
  const abrirBiometria = () => {
    setBiometriaMontada(true);
    setBiometriaAbierta(true);
  };
  const pathname = usePathname();
  const items = MENU_POR_ROL[rol] ?? [];

  const [gruposAbiertos, setGruposAbiertos] = useState<Set<string>>(new Set());

  // El grupo de la página actual siempre se ve abierto (se calcula en cada
  // render, sin guardarlo en estado) además de los que el usuario haya
  // abierto/cerrado manualmente.
  const activoAhora = grupoActivo(items, pathname);
  const gruposVisibles =
    activoAhora && !gruposAbiertos.has(activoAhora) ? new Set(gruposAbiertos).add(activoAhora) : gruposAbiertos;

  const alternarGrupo = (grupo: string) => {
    setGruposAbiertos((prev) => {
      const copia = new Set(prev);
      if (copia.has(grupo)) copia.delete(grupo);
      else copia.add(grupo);
      return copia;
    });
  };

  const iniciales = nombreCompleto
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();

  const cerrarSesion = async () => {
    try {
      const controlador = new AbortController();
      const limite = setTimeout(() => controlador.abort(), 2000);
      await fetch("/api/auth/logout", { method: "POST", signal: controlador.signal });
      clearTimeout(limite);
    } catch {
      // Si el pedido falla o se cuelga, igual sacamos al usuario abajo.
    }
    // Navegación dura (no router.push): así el próximo login arranca
    // desde cero, sin arrastrar caché del cliente de esta sesión que
    // ya cerró — eso era lo que a veces dejaba colgado el login siguiente.
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex">
      {/* ---------- Sidebar (solo escritorio) ---------- */}
      <aside className="hidden md:flex md:flex-col w-60 bg-neutral-900 border-r border-neutral-800/70 shrink-0">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-neutral-800/70">
        <div className="w-9 h-9 flex items-center justify-center shrink-0 rounded-lg border border-orange-500/70 shadow-[0_0_8px_rgba(249,115,22,0.25)] bg-neutral-800 p-1">
          <img src="/logo.png" alt={APP_NOMBRE} className="w-full h-full object-contain" />
        </div>
          <span className="font-bold text-sm">{APP_NOMBRE}</span>
        </div>
        <nav className="flex-1 py-3 px-2 space-y-1 overflow-y-auto">
          <ItemsMenu entradas={items} pathname={pathname} gruposAbiertos={gruposVisibles} onAlternarGrupo={alternarGrupo} />
        </nav>
        <div className="p-3 border-t border-neutral-800/70 flex items-center gap-2">
          <Avatar fotoUrl={fotoUrl} nombreCompleto={nombreCompleto} iniciales={iniciales} />
          <span className="text-xs text-neutral-300 truncate flex-1">{nombreCompleto}</span>
          <button
            onClick={abrirBiometria}
            title="Acceso biométrico"
            className="text-neutral-400 hover:text-orange-400 p-1.5 rounded-lg hover:bg-neutral-800 transition"
          >
            <IconoHuella className="w-4 h-4" />
          </button>
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
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-neutral-900 border-b border-neutral-800/70 sticky top-0 z-30">
          <button
              onClick={() => setMenuAbierto(true)}
              className="p-1.5 -ml-1.5 text-neutral-300 hover:text-white hover:bg-neutral-900 rounded-lg transition"
            >
            <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
            </svg>
          </button>
          <span className="font-bold text-sm">{APP_NOMBRE}</span>
          <Avatar fotoUrl={fotoUrl} nombreCompleto={nombreCompleto} iniciales={iniciales} />
        </header>

        {/* ---------- Cajón de menú (móvil), siempre montado para poder animar la entrada/salida ---------- */}
        <div
          className={`fixed inset-0 z-50 md:hidden transition-opacity duration-300 ${
            menuAbierto ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
          }`}
        >
          <div className="absolute inset-0 bg-black/50" onClick={() => setMenuAbierto(false)} />
          <div
            className={`absolute left-0 top-0 bottom-0 w-64 bg-neutral-900 border-r border-neutral-800/70 p-4 flex flex-col overflow-y-auto
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
              <ItemsMenu
                entradas={items}
                pathname={pathname}
                gruposAbiertos={gruposVisibles}
                onAlternarGrupo={alternarGrupo}
                onClickItem={() => setMenuAbierto(false)}
              />
            </nav>
            <button
              onClick={() => { setMenuAbierto(false); abrirBiometria(); }}
              className="flex items-center gap-2 text-sm text-neutral-400 hover:text-orange-400 hover:bg-neutral-900 rounded-lg px-3 py-2.5 transition"
            >
              <IconoHuella className="w-4 h-4" /> Acceso biométrico
            </button>
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

      {biometriaMontada && (
        <ModalBiometria abierto={biometriaAbierta} onCerrar={() => setBiometriaAbierta(false)} />
      )}
    </div>
  );
}
