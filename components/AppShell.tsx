// components/AppShell.tsx
// Estructura compartida de TODAS las pantallas internas de la app:
// - Escritorio: barra lateral fija con el menú según el rol
// - Móvil: header con botón de menú tipo "hamburguesa" que abre un cajón
// El menú se arma dinámicamente según el rol del usuario logueado, y se
// agrupa en secciones colapsables (acordeón) para que crecer con más
// funciones no signifique una lista plana cada vez más larga.

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { APP_NOMBRE } from "../lib/config";
import { ETIQUETAS_ROL } from "../lib/roles";
import { IconoBuseta, IconoSalir, IconoHuella, IconoCheck, IconoReloj, IconoPersonas, IconoRuta, IconoDinero, IconoEdificio, IconoUsuario, IconoGrafico, IconoControl, IconoChevron, IconoDescargar, IconoLupa, IconoEscudo } from "./Icons";
import BotonTema from "./BotonTema";
import NotificacionesMenu from "./NotificacionesMenu";
import Modal from "./Modal";
import Footer from "./Footer";
import CommandPalette, { type ItemPaleta } from "./CommandPalette";
import Breadcrumbs from "./Breadcrumbs";
import TarjetaActualizarDomicilio from "./TarjetaActualizarDomicilio";
import BotonWhatsApp from "./BotonWhatsApp";

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
// El menú del colaborador se arma aparte (ver construirMenuColaborador) porque
// depende de esSupervisor, no solo del rol.
const MENU_POR_ROL: Record<string, EntradaMenu[]> = {
  ADMIN_TH: [
    { label: "Dashboard", href: "/dashboard", icono: IconoGrafico },
    {
      grupo: "Talento Humano",
      items: [
        { label: "Aprobaciones", href: "/th/aprobaciones", icono: IconoCheck },
        { label: "Historial", href: "/th/historial", icono: IconoReloj },
        { label: "Crear solicitud", href: "/th/solicitudes", icono: IconoBuseta },
        { label: "Colaboradores", href: "/th/colaboradores", icono: IconoPersonas },
        { label: "Asignar equipo", href: "/th/colaboradores/asignaciones", icono: IconoPersonas },
        { label: "Rutas", href: "/th/rutas", icono: IconoRuta },
        { label: "Asignar rutas", href: "/th/rutas/asignaciones", icono: IconoRuta },
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
        { label: "Crear solicitud", href: "/th/solicitudes", icono: IconoBuseta },
        { label: "Colaboradores", href: "/th/colaboradores", icono: IconoPersonas },
        { label: "Asignar equipo", href: "/th/colaboradores/asignaciones", icono: IconoPersonas },
        { label: "Rutas", href: "/th/rutas", icono: IconoRuta },
        { label: "Asignar rutas", href: "/th/rutas/asignaciones", icono: IconoRuta },
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
        { label: "Carga masiva", href: "/admin/carga-masiva", icono: IconoDescargar },
        { label: "Accesos", href: "/admin/accesos", icono: IconoEscudo },
      ],
    },
  ],
};

// El colaborador siempre tiene "Registrar" + "Historial"; si además es
// Supervisor, se lo dejamos explícito en el nombre del grupo para que no
// haya dudas de qué tipo de cuenta es la que inició sesión.
function construirMenuColaborador(esSupervisor: boolean): EntradaMenu[] {
  return [
    {
      grupo: esSupervisor ? "Mi equipo" : "Mis Pasajes",
      items: [
        { label: "Registrar", href: "/mis-pasajes", icono: IconoBuseta },
        { label: "Historial", href: "/mis-pasajes/historial", icono: IconoReloj },
        { label: "Copiar rutas", href: "/mis-pasajes/copiar", icono: IconoRuta },
      ],
    },
  ];
}

// Nombre del grupo que contiene la página actual (o null si es un ítem
// suelto, o si no hay ninguno) — se usa para abrirlo solo automáticamente.
function grupoActivo(entradas: EntradaMenu[], pathname: string): string | null {
  for (const entrada of entradas) {
    if (esGrupo(entrada) && entrada.items.some((i) => i.href === pathname)) return entrada.grupo;
  }
  return null;
}

// Aplana el menú (ítems sueltos + los de cada grupo) para la paleta de
// comandos: ahí no importa la jerarquía, solo poder buscar por nombre.
function aplanarMenu(entradas: EntradaMenu[]): ItemPaleta[] {
  return entradas.flatMap((entrada) =>
    esGrupo(entrada) ? entrada.items.map((item) => ({ ...item, grupo: entrada.grupo })) : [entrada]
  );
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
          ? "bg-orange-500/10 text-orange-700 font-semibold dark:bg-orange-500/15 dark:text-orange-400"
          : "text-neutral-600 hover:bg-neutral-100 hover:shadow-sm hover:-translate-y-0.5 dark:text-neutral-300 dark:hover:bg-neutral-800/70"
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
                tieneActivo ? "text-orange-600 dark:text-orange-400" : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
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
  esSupervisor = false,
  children,
}: {
  rol: string;
  nombreCompleto: string;
  fotoUrl?: string | null;
  esSupervisor?: boolean;
  children: React.ReactNode;
}) {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [confirmandoSalir, setConfirmandoSalir] = useState(false);
  const [paletaAbierta, setPaletaAbierta] = useState(false);
  const [biometriaAbierta, setBiometriaAbierta] = useState(false);
  // Recién montamos (y con eso, descargamos) el modal la primera vez que
  // alguien lo pide — así el código de WebAuthn no viaja en cada página.
  const [biometriaMontada, setBiometriaMontada] = useState(false);
  const abrirBiometria = () => {
    setBiometriaMontada(true);
    setBiometriaAbierta(true);
  };
  const pathname = usePathname();
  const items = rol === "COLABORADOR" ? construirMenuColaborador(esSupervisor) : MENU_POR_ROL[rol] ?? [];
  const itemsPaleta = aplanarMenu(items);

  useEffect(() => {
    const alPresionar = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletaAbierta((a) => !a);
      }
    };
    window.addEventListener("keydown", alPresionar);
    return () => window.removeEventListener("keydown", alPresionar);
  }, []);

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
    <div className="min-h-screen bg-neutral-100 text-neutral-900 dark:bg-neutral-950 dark:text-white flex flex-col">
      {/* ---------- Header (todo el ancho, todas las pantallas): logo+nombre+rol a la izquierda, usuario a la derecha ---------- */}
      {/* Alto fijo (h-14/h-16), no por padding+contenido: así el offset
          "top" que usan el loading bar y los encabezados de tabla sticky
          (top-14 md:top-16) coincide siempre con la altura real del header,
          en vez de ser una aproximación que se puede desalinear. */}
      <header className="flex items-center justify-between gap-3 pl-2 pr-4 md:pl-3 md:pr-6 h-14 md:h-16 bg-white border-b border-neutral-200 dark:bg-neutral-900 dark:border-neutral-800/70 sticky top-0 z-30 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => setMenuAbierto(true)}
            aria-label="Abrir menú"
            className="md:hidden shrink-0 p-2 text-neutral-600 hover:text-neutral-900 bg-neutral-100 hover:bg-neutral-200 shadow-md shadow-neutral-300/50 dark:text-neutral-300 dark:hover:text-white dark:bg-neutral-800/80 dark:hover:bg-neutral-800 dark:shadow-black/30 rounded-lg transition"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
            </svg>
          </button>
          <img src="/logo.png" alt={APP_NOMBRE} className="w-8 h-8 md:w-9 md:h-9 object-contain shrink-0" />
          <div className="min-w-0">
            <p className="font-bold text-base leading-tight truncate">{APP_NOMBRE}</p>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-tight truncate">{ETIQUETAS_ROL[rol] ?? rol}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 min-w-0 shrink-0">
          <button
            onClick={() => setPaletaAbierta(true)}
            title="Buscar (Ctrl+K)"
            className="hidden sm:flex items-center gap-1.5 text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:text-white dark:hover:bg-neutral-800 px-2.5 py-1.5 rounded-lg transition mr-1"
          >
            <IconoLupa className="w-3.5 h-3.5" />
            <span className="text-xs font-medium">Buscar</span>
            <kbd className="text-[10px] font-semibold border border-neutral-300 dark:border-neutral-700 rounded px-1 py-0.5 ml-0.5">Ctrl K</kbd>
          </button>
          <span className="hidden md:block text-xs text-neutral-600 dark:text-neutral-300 whitespace-nowrap mr-1">{nombreCompleto}</span>
          <NotificacionesMenu rol={rol} />
          <BotonTema />
          <Avatar fotoUrl={fotoUrl} nombreCompleto={nombreCompleto} iniciales={iniciales} />
        </div>
      </header>
      {paletaAbierta && <CommandPalette items={itemsPaleta} rol={rol} onCerrar={() => setPaletaAbierta(false)} />}

      <div className="flex-1 flex min-h-0">
        {/* ---------- Sidebar (solo escritorio) ---------- */}
        <aside className="hidden md:flex md:flex-col w-60 bg-white border-r border-neutral-200 dark:bg-neutral-900 dark:border-neutral-800/70 shrink-0">
          <nav className="flex-1 py-3 px-2 space-y-1 overflow-y-auto">
            <ItemsMenu entradas={items} pathname={pathname} gruposAbiertos={gruposVisibles} onAlternarGrupo={alternarGrupo} />
          </nav>
          <div className="p-3 border-t border-neutral-200 dark:border-neutral-800/70 flex items-center justify-between gap-2">
            {rol === "COLABORADOR" ? (
              <BotonWhatsApp />
            ) : (
              <Avatar fotoUrl={fotoUrl} nombreCompleto={nombreCompleto} iniciales={iniciales} />
            )}
            <div className="flex items-center gap-1">
            <button
              onClick={abrirBiometria}
              title="Acceso biométrico"
              className="text-neutral-500 hover:text-orange-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:text-orange-400 dark:hover:bg-neutral-800 p-1.5 rounded-lg transition"
            >
              <IconoHuella className="w-4 h-4" />
            </button>
            <button
              onClick={() => setConfirmandoSalir(true)}
              title="Cerrar sesión"
              className="text-neutral-500 hover:text-red-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:text-red-400 dark:hover:bg-neutral-800 p-1.5 rounded-lg transition"
            >
              <IconoSalir className="w-4 h-4" />
            </button>
            </div>
          </div>
        </aside>

        <div className="flex-1 flex flex-col min-w-0">
        {/* ---------- Cajón de menú (móvil), siempre montado para poder animar la entrada/salida ---------- */}
        <div
          className={`fixed inset-0 z-50 md:hidden transition-opacity duration-300 ${
            menuAbierto ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
          }`}
        >
          <div className="absolute inset-0 bg-black/50" onClick={() => setMenuAbierto(false)} />
          <div
            className={`absolute left-0 top-0 bottom-0 w-64 bg-white border-r border-neutral-200 dark:bg-neutral-900 dark:border-neutral-800/70 p-4 flex flex-col overflow-y-auto
              transition-transform duration-300 ease-out
              ${menuAbierto ? "translate-x-0" : "-translate-x-full"}
            `}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="font-bold text-sm">{APP_NOMBRE}</span>
              <button
                onClick={() => setMenuAbierto(false)}
                aria-label="Cerrar menú"
                className="text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:text-white dark:hover:bg-neutral-800 rounded-lg w-7 h-7 flex items-center justify-center text-xl leading-none transition"
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
            {rol === "COLABORADOR" && (
              <BotonWhatsApp variante="fila" onClick={() => setMenuAbierto(false)} />
            )}
            <button
              onClick={() => { setMenuAbierto(false); abrirBiometria(); }}
              className="flex items-center gap-2 text-sm text-neutral-500 hover:text-orange-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:text-orange-400 dark:hover:bg-neutral-900 rounded-lg px-3 py-2.5 transition"
            >
              <IconoHuella className="w-4 h-4" /> Acceso biométrico
            </button>
            <button
              onClick={() => { setMenuAbierto(false); setConfirmandoSalir(true); }}
              className="flex items-center gap-2 text-sm text-neutral-500 hover:text-red-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:text-red-400 dark:hover:bg-neutral-900 rounded-lg px-3 py-2.5 transition"
            >
              <IconoSalir className="w-4 h-4" /> Cerrar sesión
            </button>
          </div>
        </div>

        <main className="flex-1 min-w-0 flex flex-col">
          <Breadcrumbs items={itemsPaleta} />
          <div className="flex-1">{children}</div>
          <Footer />
        </main>
        </div>
      </div>

      {biometriaMontada && (
        <ModalBiometria abierto={biometriaAbierta} onCerrar={() => setBiometriaAbierta(false)} />
      )}

      {rol === "COLABORADOR" && <TarjetaActualizarDomicilio />}

      <Modal abierto={confirmandoSalir} onCerrar={() => setConfirmandoSalir(false)} onConfirmar={cerrarSesion} variante="centro" className="bg-white dark:bg-neutral-900 text-black dark:text-white rounded-3xl p-7 w-full max-w-xs text-center space-y-4 shadow-2xl">
        <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-500/15 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto">
          <IconoSalir className="w-5 h-5" />
        </div>
        <div>
          <p className="font-semibold text-neutral-900 dark:text-white">¿Cerrar sesión?</p>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">Vas a tener que ingresar tu PIN de nuevo para volver a entrar.</p>
        </div>
        <div className="flex gap-2 justify-center pt-1">
          <button
            onClick={() => setConfirmandoSalir(false)}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
          >
            Cancelar
          </button>
          <button
            onClick={cerrarSesion}
            className="flex-1 px-4 py-2.5 text-sm font-semibold bg-red-500 hover:bg-red-600 text-white rounded-xl transition"
          >
            Sí, salir
          </button>
        </div>
      </Modal>
    </div>
  );
}
