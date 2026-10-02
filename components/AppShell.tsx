// components/AppShell.tsx
// Estructura compartida de TODAS las pantallas internas de la app:
// - Escritorio: barra lateral fija con el menú según el rol
// - Móvil: header con botón de menú tipo "hamburguesa" que abre un cajón
// El menú se arma dinámicamente según el rol del usuario logueado, y se
// agrupa en secciones colapsables (acordeón) para que crecer con más
// funciones no signifique una lista plana cada vez más larga.

"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { APP_NOMBRE } from "../lib/config";
import { ETIQUETAS_ROL } from "../lib/roles";
import { IconoBuseta, IconoSalir, IconoCheck, IconoReloj, IconoPersonas, IconoRuta, IconoDinero, IconoEdificio, IconoUsuario, IconoGrafico, IconoControl, IconoChevron, IconoDescargar, IconoLupa, IconoAjustes, IconoNovedad } from "./Icons";
import MenuUsuario from "./MenuUsuario";
import ModalConfirmar from "./ModalConfirmar";
import Footer from "./Footer";
import CommandPalette, { type ItemPaleta } from "./CommandPalette";
import Breadcrumbs from "./Breadcrumbs";
import TarjetaActualizarDomicilio from "./TarjetaActualizarDomicilio";
import { AccionesHeaderContext } from "../lib/accionesHeader";
import { CargaGlobalContext } from "../lib/cargaGlobal";
import BarraCarga from "./BarraCarga";
import VigilanteSesion from "./VigilanteSesion";
import AvisoNovedades from "./AvisoNovedades";
import { ZonaAvisos } from "./ZonaAvisos";
import ScrollSutil from "./ScrollSutil";
import type { Novedad } from "../lib/novedades";
import { useContadorMenu, type ContadorMenu } from "../lib/useContadorMenu";

// Carga diferida: el código de WebAuthn (~16KB) solo se descarga la
// primera vez que alguien abre el modal, no en cada página de la app.
const ModalBiometria = dynamic(() => import("./ModalBiometria"), { ssr: false });

type IconoComponente = (props: { className?: string }) => React.ReactElement;
// descripcion: subtítulo de la pantalla, para el breadcrumb (Breadcrumbs.tsx)
// — antes vivía repetido dentro de cada Panel, debajo de su propio <h1>.
type ItemMenu = { label: string; href: string; descripcion: string; icono: IconoComponente };
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
// Para todos los roles (ver lib/novedades.ts): funciones nuevas de la app.
const NOVEDADES: ItemMenu = {
  label: "Novedades",
  href: "/novedades",
  descripcion: "Funciones nuevas de la app (cada una se muestra durante un mes)",
  icono: IconoNovedad,
};

const DASHBOARD: ItemMenu = {
  label: "Dashboard",
  href: "/dashboard",
  descripcion: "Resumen del período seleccionado",
  icono: IconoGrafico,
};

const MENU_TALENTO_HUMANO: GrupoMenu = {
  grupo: "Talento Humano",
  items: [
    { label: "Bandeja de aprobaciones", href: "/th/aprobaciones", descripcion: "Solicitudes de colaboradores esperando aprobación", icono: IconoCheck },
    { label: "Historial de aprobaciones", href: "/th/historial", descripcion: "Solicitudes aprobadas, revisadas y pagadas", icono: IconoReloj },
    { label: "Colaboradores", href: "/th/colaboradores", descripcion: "Crea y administra los colaboradores de tu Empresa/Sitio/Área", icono: IconoPersonas },
    { label: "Asignar equipo", href: "/th/colaboradores/asignaciones", descripcion: "Elegir un supervisor y marca quiénes de su área le reportan", icono: IconoPersonas },
    { label: "Rutas", href: "/th/rutas", descripcion: "Cada Área puede tener varias rutas (una por cada trayecto)", icono: IconoRuta },
    { label: "Asignar rutas", href: "/th/rutas/asignaciones", descripcion: "Elegir un colaborador y marcar que rutas le quedan exclusivas a él", icono: IconoRuta },
  ],
};

// TH también registra sus propias rutas (y, por contingencia, las de
// colaboradores de sus áreas): mismas pantallas que el colaborador.
const MENU_MIS_SOLICITUDES_TH: GrupoMenu = {
  grupo: "Mis solicitudes",
  items: [
    { label: "Registrar", href: "/th/mis-solicitudes", descripcion: "Registra tus solicitudes (o las de un colaborador de tus áreas) y corrige las pendientes o rechazadas", icono: IconoBuseta },
    { label: "Historial", href: "/th/mis-solicitudes/historial", descripcion: "Lo que registraste: aprobado, revisado y pagado", icono: IconoReloj },
  ],
};

const MENU_COORDINACION: GrupoMenu = {
  grupo: "Coordinación",
  items: [
    { label: "Bandeja de revisiones", href: "/coordinador/revision", descripcion: "Solicitudes aprobadas listas para revisar", icono: IconoCheck },
    { label: "Historial de revisiones", href: "/coordinador/historial", descripcion: "Solicitudes revisadas y pagadas", icono: IconoReloj },
  ],
};

const MENU_NOMINA: GrupoMenu = {
  grupo: "Nómina",
  items: [
    { label: "Bandeja de pagos", href: "/nomina/pagos", descripcion: "Solicitudes revisadas listas para pagar", icono: IconoDinero },
    { label: "Historial de pagos", href: "/nomina/historial", descripcion: "Solicitudes ya pagadas", icono: IconoReloj },
  ],
};

const HISTORIAL_GENERAL: ItemMenu = {
  label: "Historial General",
  href: "/jefe/historial",
  descripcion: "Todas las solicitudes, cualquier estado",
  icono: IconoReloj,
};

// Cada rol es una lista de ítems sueltos (ej. "Dashboard") y/o grupos
// colapsables. Agregar una función nueva a futuro es sumar un ítem dentro
// del grupo que corresponda (o crear un grupo nuevo) — no hace falta
// tocar el componente.
// El menú del colaborador se arma aparte (ver construirMenuColaborador) porque
// depende de esSupervisor, no solo del rol.
const MENU_POR_ROL: Record<string, EntradaMenu[]> = {
  ADMIN_TH: [DASHBOARD, MENU_MIS_SOLICITUDES_TH, MENU_TALENTO_HUMANO, NOVEDADES],
  COORDINADOR: [DASHBOARD, MENU_COORDINACION, NOVEDADES],
  NOMINA: [DASHBOARD, MENU_NOMINA, NOVEDADES],
  JEFE: [DASHBOARD, HISTORIAL_GENERAL, NOVEDADES],
  SUPER_ADMIN: [
    DASHBOARD,
    MENU_MIS_SOLICITUDES_TH,
    MENU_TALENTO_HUMANO,
    MENU_COORDINACION,
    MENU_NOMINA,
    { grupo: "Informes", items: [HISTORIAL_GENERAL] },
    {
      grupo: "Administración",
      items: [
        { label: "Empresas", href: "/admin/empresas", descripcion: "Administra la estructura de empresas, sitios y áreas", icono: IconoEdificio },
        { label: "Usuarios", href: "/admin/usuarios", descripcion: "Talento Humano, Coordinadores, Nómina, Jefes y Super Administradores", icono: IconoUsuario },
        { label: "Control de Solicitudes", href: "/admin/solicitudes", descripcion: "Busca por código o filtra, y puedes eliminar cualquier solicitud sin importar su estado", icono: IconoControl },
        { label: "Carga masiva", href: "/admin/carga-masiva", descripcion: "Carga muchos colaboradores o rutas de una sola vez desde un Excel", icono: IconoDescargar },
        { label: "Parámetros", href: "/admin/parametros", descripcion: "Valores generales del sistema, configurables sin tocar código", icono: IconoAjustes },
      ],
    },
    NOVEDADES,
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
        { label: "Registrar", href: "/mis-pasajes", descripcion: "Registra y da seguimiento a tus solicitudes de pasajes", icono: IconoBuseta },
        { label: "Historial", href: "/mis-pasajes/historial", descripcion: "Solicitudes aprobadas, revisadas y pagadas, filtradas por fecha", icono: IconoReloj },
        { label: "Copiar rutas", href: "/mis-pasajes/copiar", descripcion: "Elige el día del que quieres copiar, marca las rutas y a qué día se repiten", icono: IconoRuta },
      ],
    },
    NOVEDADES,
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

// Color de cada ícono del menú según lo que representa (el mismo ícono
// en distintos grupos, mismo color): cuadrito de fondo suave con el
// ícono de color, y sólido con el ícono blanco en la pantalla actual.
// Clases completas (no armadas con variables) para que Tailwind las vea.
const COLOR_ICONO_MENU = new Map<IconoComponente, { suave: string; activo: string }>([
  [IconoGrafico, { suave: "bg-violet-500/10 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400", activo: "bg-violet-500 text-white" }],
  [IconoCheck, { suave: "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400", activo: "bg-emerald-500 text-white" }],
  [IconoReloj, { suave: "bg-sky-500/10 text-sky-600 dark:bg-sky-500/15 dark:text-sky-400", activo: "bg-sky-500 text-white" }],
  [IconoPersonas, { suave: "bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400", activo: "bg-indigo-500 text-white" }],
  [IconoRuta, { suave: "bg-orange-500/10 text-orange-600 dark:bg-orange-500/15 dark:text-orange-400", activo: "bg-orange-500 text-white" }],
  [IconoBuseta, { suave: "bg-amber-500/15 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400", activo: "bg-amber-500 text-white" }],
  [IconoDinero, { suave: "bg-green-500/10 text-green-600 dark:bg-green-500/15 dark:text-green-400", activo: "bg-green-600 text-white" }],
  [IconoEdificio, { suave: "bg-slate-500/10 text-slate-600 dark:bg-slate-400/15 dark:text-slate-300", activo: "bg-slate-600 text-white" }],
  [IconoUsuario, { suave: "bg-cyan-500/10 text-cyan-600 dark:bg-cyan-500/15 dark:text-cyan-400", activo: "bg-cyan-600 text-white" }],
  [IconoControl, { suave: "bg-rose-500/10 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400", activo: "bg-rose-500 text-white" }],
  [IconoDescargar, { suave: "bg-teal-500/10 text-teal-600 dark:bg-teal-500/15 dark:text-teal-400", activo: "bg-teal-600 text-white" }],
  [IconoAjustes, { suave: "bg-zinc-500/10 text-zinc-600 dark:bg-zinc-400/15 dark:text-zinc-300", activo: "bg-zinc-600 text-white" }],
  [IconoNovedad, { suave: "bg-pink-500/10 text-pink-600 dark:bg-pink-500/15 dark:text-pink-400", activo: "bg-pink-500 text-white" }],
]);
const COLOR_ICONO_POR_DEFECTO = { suave: "bg-neutral-500/10 text-neutral-600 dark:text-neutral-300", activo: "bg-orange-500 text-white" };

const esRechazadas = (c: ContadorMenu) => c.href === "/mis-pasajes" || c.href === "/th/mis-solicitudes";

// Número de pendientes en el menú (reemplaza a la campanita), con el color
// del estado de esa bandeja.
function BadgeContador({ contador }: { contador: ContadorMenu }) {
  return (
    <span
      title={`${contador.total} ${contador.texto}`}
      className={`ml-auto min-w-5 h-5 px-1.5 rounded-full text-[11px] font-bold leading-none flex items-center justify-center shrink-0 tabular-nums ${contador.clase}`}
    >
      {contador.total > 99 ? "99+" : contador.total}
    </span>
  );
}

function ItemLink({
  item,
  activo,
  onClick,
  contadores,
  colapsado = false,
}: {
  item: ItemMenu;
  activo: boolean;
  onClick?: () => void;
  contadores: ContadorMenu[];
  colapsado?: boolean;
}) {
  const contador = contadores.find((c) => c.href === item.href);
  const Icono = item.icono;
  const color = COLOR_ICONO_MENU.get(Icono) ?? COLOR_ICONO_POR_DEFECTO;
  return (
    <Link
      href={item.href}
      onClick={onClick}
      // Sin esto, Next precarga el RSC de CADA ítem del menú apenas queda
      // visible (sidebar entero a la vista = todas las rutas a la vez) —
      // cada página hace su propia verificación de sesión en el servidor,
      // así que solo con abrir el menú se disparaban consultas reales sin
      // que el usuario tocara nada. El contenido real de cada pantalla ya
      // se pide por su cuenta al montar (fetch en el cliente), así que no
      // se pierde nada por no precargar el RSC.
      prefetch={false}
      title={colapsado ? item.label : undefined}
      aria-label={colapsado ? item.label : undefined}
      // px-2.5 fijo (no justify-center al colapsar): así el ícono queda en
      // el mismo lugar en los dos modos y no salta mientras el ancho anima.
      className={`relative flex items-center gap-2.5 py-1.5 px-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition ${
        activo
          ? "bg-orange-500/10 text-orange-700 font-semibold dark:bg-orange-500/15 dark:text-orange-400"
          : "text-neutral-600 hover:bg-neutral-100 hover:shadow-sm dark:text-neutral-300 dark:hover:bg-neutral-800/70"
      }`}
    >
      <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition ${activo ? `${color.activo} shadow-sm` : color.suave}`}>
        <Icono className="w-4 h-4" />
      </span>
      {!colapsado && <span className="truncate">{item.label}</span>}
      {contador &&
        (colapsado ? (
          // Colapsado no cabe el número: un punto del mismo color en la
          // esquina del ícono (el número sigue en el title del enlace).
          <span className={`absolute top-1.5 right-2.5 w-2 h-2 rounded-full ring-2 ring-white dark:ring-neutral-900 ${contador.clase.split(" ")[0]}`} />
        ) : (
          <BadgeContador contador={contador} />
        ))}
    </Link>
  );
}

function ItemsMenu({
  entradas,
  pathname,
  gruposAbiertos,
  onAlternarGrupo,
  onClickItem,
  contadores,
  colapsado = false,
}: {
  entradas: EntradaMenu[];
  pathname: string;
  gruposAbiertos: Set<string>;
  onAlternarGrupo: (grupo: string) => void;
  onClickItem?: () => void;
  contadores: ContadorMenu[];
  colapsado?: boolean;
}) {
  // Colapsado (solo íconos) no hay títulos de grupo que abrir: se ven
  // todos los ítems, con una rayita entre un grupo y el siguiente.
  if (colapsado) {
    return (
      <>
        {entradas.map((entrada) =>
          esGrupo(entrada) ? (
            <div key={entrada.grupo} className="space-y-1 pt-1 mt-1 border-t border-neutral-200 dark:border-neutral-800/70">
              {entrada.items.map((item) => (
                <ItemLink key={item.href} item={item} activo={pathname === item.href} contadores={contadores} colapsado />
              ))}
            </div>
          ) : (
            <ItemLink key={entrada.href} item={entrada} activo={pathname === entrada.href} contadores={contadores} colapsado />
          )
        )}
      </>
    );
  }
  return (
    <>
      {entradas.map((entrada) => {
        if (!esGrupo(entrada)) {
          return <ItemLink key={entrada.href} item={entrada} activo={pathname === entrada.href} onClick={onClickItem} contadores={contadores} />;
        }
        const abierto = gruposAbiertos.has(entrada.grupo);
        const tieneActivo = entrada.items.some((i) => i.href === pathname);
        // Con el grupo cerrado, sus números se ven en el título del grupo.
        const contadoresGrupo = abierto ? [] : contadores.filter((c) => entrada.items.some((i) => i.href === c.href));
        return (
          <div key={entrada.grupo}>
            <button
              type="button"
              onClick={() => onAlternarGrupo(entrada.grupo)}
              className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-[11px] font-semibold uppercase tracking-wide transition ${
                tieneActivo ? "text-orange-600 dark:text-orange-400" : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
              }`}
            >
              <span className="flex min-w-0 flex-1 items-center gap-2">
                {entrada.grupo}
                {contadoresGrupo.map((c) => (
                  <BadgeContador key={c.href} contador={c} />
                ))}
              </span>
              <IconoChevron className={`w-3.5 h-3.5 shrink-0 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${abierto ? "rotate-90" : ""}`} />
            </button>
            {/* Truco de CSS grid (0fr -> 1fr) para animar a "altura automática"
                sin tener que medirla con JS: el contenido siempre está montado
                (así el navegador puede calcular su altura real), y es el propio
                grid el que la anima al abrir/cerrar. */}
            <div
              className="grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
              style={{ gridTemplateRows: abierto ? "1fr" : "0fr" }}
            >
              <div className="overflow-hidden">
                <div
                  className={`space-y-1 pb-1 transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${abierto ? "opacity-100 translate-y-0 delay-75" : "opacity-0 -translate-y-1"}`}
                >
                  {entrada.items.map((item) => (
                    <ItemLink key={item.href} item={item} activo={pathname === item.href} onClick={onClickItem} contadores={contadores} />
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
  nombreCorto,
  fotoUrl,
  empresa = "",
  esSupervisor = false,
  novedades = [],
  usuarioId,
  children,
}: {
  rol: string;
  nombreCompleto: string;
  // Primer nombre + primer apellido, para el menú de usuario — el
  // completo ocupaba demasiado espacio (ver lib/auth.ts).
  nombreCorto: string;
  fotoUrl?: string | null;
  // Empresa a la que pertenece, para el menú de usuario (ver
  // obtenerPerfilSesion en lib/auth.ts); vacía si no aplica.
  empresa?: string;
  esSupervisor?: boolean;
  // Novedades vigentes para este rol (calculadas en el layout, sin base de
  // datos — ver lib/novedades.ts); el aviso flotante muestra las no vistas.
  novedades?: Novedad[];
  // Para recordar por usuario (no por navegador) qué novedades ya vio.
  usuarioId: string;
  children: React.ReactNode;
}) {
  const [menuAbierto, setMenuAbierto] = useState(false);
  // Escritorio: menú lateral reducido a íconos, solo si el usuario lo
  // pide. Siempre arranca expandido: antes se recordaba en el navegador y,
  // si alguien lo colapsaba una vez (sin querer), quedaba así para siempre.
  const [menuColapsado, setMenuColapsado] = useState(false);
  useEffect(() => {
    try {
      // Limpia la preferencia vieja que guardaba el colapso.
      localStorage.removeItem("menuColapsado");
    } catch {
      // Sin acceso a localStorage (modo privado, etc.): nada que limpiar.
    }
  }, []);
  const alternarMenuColapsado = () => setMenuColapsado((actual) => !actual);
  // Botón principal de la pantalla actual (ej. "+ Nueva ruta"), publicado
  // por el propio Panel vía useAccionesHeader — se muestra en la misma
  // fila que el breadcrumb, a la derecha (ver lib/accionesHeader.tsx).
  const [accionesHeader, setAccionesHeader] = useState<React.ReactNode>(null);
  // Ids de todas las cargas en curso (loading.tsx mientras navegan, y el
  // cargandoInicial de cada Panel mientras trae sus datos) — la franja se
  // muestra mientras haya al menos una (ver lib/cargaGlobal.tsx).
  const [cargasActivas, setCargasActivas] = useState<Set<string>>(new Set());
  const reportarCarga = useCallback((id: string, cargando: boolean) => {
    setCargasActivas((previas) => {
      if (cargando === previas.has(id)) return previas;
      const siguientes = new Set(previas);
      if (cargando) siguientes.add(id);
      else siguientes.delete(id);
      return siguientes;
    });
  }, []);
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
  const contadores = useContadorMenu(rol);
  const totalPendientes = contadores.reduce((acc, c) => acc + c.total, 0);

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

  // Del nombre corto (primer nombre + primer apellido), no del completo:
  // "Ana María López Pérez" daba "AM" en vez de "AL". Se toma la primera y
  // la última palabra para saltar partículas ("Ana De la Torre" → "AT").
  const palabrasNombre = (nombreCorto || nombreCompleto).trim().split(/\s+/).filter(Boolean);
  const iniciales = [palabrasNombre[0], palabrasNombre.length > 1 ? palabrasNombre[palabrasNombre.length - 1] : undefined]
    .filter(Boolean)
    .map((p) => p![0])
    .join("")
    .toUpperCase();

  const [cerrandoSesion, setCerrandoSesion] = useState(false);
  const cerrarSesion = async () => {
    if (cerrandoSesion) return;
    setCerrandoSesion(true);
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
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = "/login";
  };

  return (
    <AccionesHeaderContext.Provider value={setAccionesHeader}>
    <CargaGlobalContext.Provider value={reportarCarga}>
    <div className="min-h-screen bg-neutral-100 text-neutral-900 dark:bg-neutral-950 dark:text-white flex flex-col">
      {/* Única instancia de la franja naranja para TODA la sesión — nunca
          se desmonta, ver components/BarraCarga.tsx y lib/cargaGlobal.tsx. */}
      <BarraCarga visible={cargasActivas.size > 0} />
      <VigilanteSesion />
      {/* ---------- Header (todo el ancho, todas las pantallas): logo + nombre de la app a la izquierda; buscar y menú de usuario (MenuUsuario) a la derecha ---------- */}
      {/* Alto fijo (h-14/h-16), no por padding+contenido: así el offset
          "top" que usan el loading bar y los encabezados de tabla sticky
          (top-14 md:top-16) coincide siempre con la altura real del header,
          en vez de ser una aproximación que se puede desalinear. */}
      <header className="flex items-center justify-between gap-3 pl-2 pr-4 md:pl-3 md:pr-6 h-14 md:h-16 bg-white border-b border-neutral-200/80 shadow-[0_4px_18px_-6px_rgba(0,0,0,0.14)] dark:bg-neutral-900 dark:border-neutral-800/70 dark:shadow-[0_4px_18px_-6px_rgba(0,0,0,0.7)] sticky top-0 z-30 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => setMenuAbierto(true)}
            aria-label={totalPendientes > 0 ? `Abrir menú (${totalPendientes} pendientes)` : "Abrir menú"}
            className="relative md:hidden shrink-0 p-2 text-white bg-gradient-to-br from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 shadow-md shadow-orange-500/30 dark:shadow-orange-900/40 rounded-xl transition"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
            </svg>
            {/* Celular: el menú está escondido, así que el aviso va en el botón:
                un punto que palpita, del color de lo pendiente. Si hay dos
                (TH: por aprobar y rechazadas propias), van montados, con el
                de la bandeja adelante. */}
            {contadores.length > 0 && (
              <span className="absolute -top-1 -right-1 flex">
                {[...contadores]
                  .sort((x, y) => Number(esRechazadas(y)) - Number(esRechazadas(x)))
                  .map((c, i) => {
                    const color = c.clase.split(" ")[0];
                    return (
                      <span key={c.href} className={`relative flex h-2.5 w-2.5 ${i > 0 ? "-ml-1" : ""}`}>
                        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${color}`} />
                        <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ring-2 ring-white dark:ring-neutral-900 ${color}`} />
                      </span>
                    );
                  })}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={alternarMenuColapsado}
            aria-label={menuColapsado ? "Expandir menú" : "Colapsar menú"}
            aria-pressed={menuColapsado}
            title={menuColapsado ? "Expandir menú" : "Colapsar menú"}
            className="hidden md:inline-flex shrink-0 p-2 text-neutral-500 hover:text-orange-600 hover:bg-orange-100 active:bg-orange-200 dark:text-neutral-400 dark:hover:text-orange-400 dark:hover:bg-orange-500/15 dark:active:bg-orange-500/25 rounded-lg transition"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="16" rx="2" />
              <path d="M9 4v16" />
              <path d={menuColapsado ? "M13 10l2 2-2 2" : "M15 10l-2 2 2 2"} />
            </svg>
          </button>
          {/* <img>, no <Image>: logo local fijo
              — /logo.png tiene su propio Cache-Control en next.config.ts. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt={APP_NOMBRE} className="w-8 h-8 md:w-9 md:h-9 object-contain shrink-0" />
          {/* Sin el rol debajo: header más limpio, el rol está en el menú de usuario. */}
          <p className="min-w-0 font-bold text-lg md:text-xl tracking-tight leading-tight truncate">{APP_NOMBRE}</p>
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
          <MenuUsuario
            nombreCompleto={nombreCompleto}
            nombreCorto={nombreCorto}
            iniciales={iniciales}
            fotoUrl={fotoUrl}
            empresa={empresa}
            etiquetaRol={ETIQUETAS_ROL[rol] ?? rol}
            esColaborador={rol === "COLABORADOR"}
            onBiometria={abrirBiometria}
            onCerrarSesion={() => setConfirmandoSalir(true)}
          />
        </div>
      </header>
      {paletaAbierta && <CommandPalette items={itemsPaleta} rol={rol} onCerrar={() => setPaletaAbierta(false)} />}

      <div className="flex-1 flex min-h-0">
        {/* ---------- Sidebar (solo escritorio) ---------- */}
        {/* Sticky bajo el header y con el alto exacto del viewport restante:
            el scroll de la ventana mueve solo el contenido de la pantalla, y
            el menú no se estira con él — si sus propios ítems no caben, el
            <nav> scrollea por dentro. Se mantiene el scroll de la ventana
            (no un <main> con overflow propio) para no romper los
            encabezados de tabla sticky que usan top-14/md:top-16. */}
        <aside className={`hidden md:flex md:flex-col md:sticky md:top-16 md:h-[calc(100dvh-4rem)] self-start ${menuColapsado ? "w-16" : "w-60"} transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none bg-white border-r border-neutral-200 dark:bg-neutral-900 dark:border-neutral-800/70 shrink-0`}>
          <ScrollSutil as="nav" className="flex-1 py-3 px-2 space-y-1">
            <ItemsMenu entradas={items} pathname={pathname} gruposAbiertos={gruposVisibles} onAlternarGrupo={alternarGrupo} contadores={contadores} colapsado={menuColapsado} />
          </ScrollSutil>
        </aside>

        <div className="flex-1 flex flex-col min-w-0">
        {/* ---------- Cajón de menú (móvil), siempre montado para poder animar la entrada/salida ---------- */}
        <div
          className={`fixed inset-0 z-50 md:hidden transition-opacity duration-300 ease-out motion-reduce:transition-none ${
            menuAbierto ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
          }`}
        >
          <div className="absolute inset-0 bg-black/50" onClick={() => setMenuAbierto(false)} />
          <div
            className={`absolute left-0 top-0 bottom-0 w-64 bg-white border-r border-neutral-200 dark:bg-neutral-900 dark:border-neutral-800/70 p-4 flex flex-col overflow-y-auto scroll-sutil
              transition-transform duration-[380ms] ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none
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
                contadores={contadores}
              />
            </nav>
          </div>
        </div>

        <main className="flex-1 min-w-0 flex flex-col">
          <Breadcrumbs items={itemsPaleta} acciones={accionesHeader} />
          <div className="flex-1">{children}</div>
          <Footer />
        </main>
        </div>
      </div>

      {biometriaMontada && (
        <ModalBiometria abierto={biometriaAbierta} onCerrar={() => setBiometriaAbierta(false)} />
      )}

      <ZonaAvisos />
      {rol === "COLABORADOR" && <TarjetaActualizarDomicilio />}
      <AvisoNovedades novedades={novedades} usuarioId={usuarioId} />

      <ModalConfirmar
        abierto={confirmandoSalir}
        onCerrar={() => setConfirmandoSalir(false)}
        onConfirmar={cerrarSesion}
        procesando={cerrandoSesion}
        tono="rojo"
        icono={IconoSalir}
        titulo="¿Cerrar sesión?"
        textoConfirmar="Sí, salir"
        textoProcesando="Saliendo..."
      >
        <p className="text-sm text-neutral-500 dark:text-neutral-400">Vas a tener que ingresar tu PIN de nuevo para volver a entrar.</p>
      </ModalConfirmar>
    </div>
    </CargaGlobalContext.Provider>
    </AccionesHeaderContext.Provider>
  );
}
