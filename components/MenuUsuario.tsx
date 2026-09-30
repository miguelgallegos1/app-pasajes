// components/MenuUsuario.tsx
// Avatar del header (con el punto verde de sesión activa) que abre la
// tarjeta de perfil: foto/iniciales, nombre corto con el rol al lado,
// empresa debajo, accesos rápidos en cuadros de color (Acceso biométrico,
// Tema y — solo Colaborador, si TH configuró un número — WhatsApp a TH) y
// Cerrar sesión abajo. Es el único lugar de la app con estas acciones (ya
// no están en el menú lateral). Se cierra con clic afuera, con Escape o al
// elegir una opción.

"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useTema } from "./ThemeProvider";
import { useLinkWhatsAppTH } from "../lib/useLinkWhatsAppTH";
import { IconoHuella, IconoLuna, IconoSalir, IconoSol, IconoWhatsApp } from "./Icons";

function AvatarPerfil({ fotoUrl, nombreCompleto, iniciales, grande }: { fotoUrl?: string | null; nombreCompleto: string; iniciales: string; grande?: boolean }) {
  const tam = grande ? "w-12 h-12 text-base" : "w-8 h-8 text-xs";
  return (
    <span className="relative shrink-0">
      {fotoUrl ? (
        // <img>, no <Image>: fotoUrl es de origen libre (foto del
        // colaborador, sin dominio fijo que declarar en remotePatterns).
        // eslint-disable-next-line @next/next/no-img-element
        <img src={fotoUrl} alt={nombreCompleto} className={`${tam} rounded-full object-cover`} />
      ) : (
        <span className={`${tam} rounded-full bg-gradient-to-br from-orange-400 to-orange-600 text-white font-bold flex items-center justify-center`}>{iniciales}</span>
      )}
      {/* Sesión activa: punto verde con el borde del color del fondo. */}
      <span
        aria-hidden="true"
        className={`absolute bottom-0 right-0 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-neutral-900 ${grande ? "w-3.5 h-3.5" : "w-2.5 h-2.5"}`}
      />
    </span>
  );
}

// Cada acción con su propio color (fondo suave + ícono en un círculo de
// color sólido), para que se reconozcan de un vistazo.
function Cuadro({
  icono,
  texto,
  tono,
  onClick,
  href,
}: {
  icono: ReactNode;
  texto: string;
  tono: { cuadro: string; circulo: string };
  onClick?: () => void;
  href?: string;
}) {
  const clases = `flex flex-col items-center justify-center gap-2 rounded-xl border px-1 py-3 text-[11px] font-semibold transition ${tono.cuadro}`;
  const contenido = (
    <>
      <span className={`w-9 h-9 rounded-full flex items-center justify-center text-white shadow-sm ${tono.circulo}`}>{icono}</span>
      {texto}
    </>
  );
  return href ? (
    <a href={href} target="_blank" rel="noopener noreferrer" role="menuitem" onClick={onClick} className={clases}>
      {contenido}
    </a>
  ) : (
    <button type="button" role="menuitem" onClick={onClick} className={clases}>
      {contenido}
    </button>
  );
}

const TONO_BIOMETRIA = {
  cuadro: "border-violet-200 bg-violet-50 text-violet-800 hover:bg-violet-100 hover:border-violet-300 dark:border-violet-500/25 dark:bg-violet-500/10 dark:text-violet-300 dark:hover:bg-violet-500/20",
  circulo: "bg-gradient-to-br from-violet-500 to-indigo-600",
};
// El cuadro de Tema muestra el modo al que vas a cambiar: sol ámbar para
// pasar a claro, luna azul noche para pasar a oscuro.
const TONO_A_OSCURO = {
  cuadro: "border-indigo-200 bg-indigo-50 text-indigo-800 hover:bg-indigo-100 hover:border-indigo-300",
  circulo: "bg-gradient-to-br from-indigo-700 to-slate-900",
};
const TONO_A_CLARO = {
  cuadro: "border-amber-500/25 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20",
  circulo: "bg-gradient-to-br from-amber-400 to-orange-500",
};
const TONO_WHATSAPP = {
  cuadro: "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 hover:border-emerald-300 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-300 dark:hover:bg-emerald-500/20",
  circulo: "bg-[#25D366]",
};

export default function MenuUsuario({
  nombreCompleto,
  nombreCorto,
  iniciales,
  fotoUrl,
  empresa,
  etiquetaRol,
  esColaborador,
  onBiometria,
  onCerrarSesion,
}: {
  nombreCompleto: string;
  nombreCorto: string;
  iniciales: string;
  fotoUrl?: string | null;
  empresa: string;
  etiquetaRol: string;
  esColaborador: boolean;
  onBiometria: () => void;
  onCerrarSesion: () => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const botonRef = useRef<HTMLButtonElement>(null);
  const { tema, alternarTema } = useTema();
  const linkWhatsApp = useLinkWhatsAppTH(esColaborador);

  useEffect(() => {
    if (!abierto) return;
    const alClic = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setAbierto(false);
    };
    const alTecla = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setAbierto(false);
      botonRef.current?.focus();
    };
    document.addEventListener("mousedown", alClic);
    document.addEventListener("keydown", alTecla);
    return () => {
      document.removeEventListener("mousedown", alClic);
      document.removeEventListener("keydown", alTecla);
    };
  }, [abierto]);

  const elegir = (accion: () => void) => () => {
    setAbierto(false);
    accion();
  };

  const oscuro = tema === "dark";
  // Columnas según cuántos cuadros hay (2 sin WhatsApp, 3 con él), para
  // que nunca quede un hueco vacío en la fila.
  const columnas = linkWhatsApp ? "grid-cols-3" : "grid-cols-2";

  return (
    <div className="relative ml-1" ref={ref}>
      <button
        ref={botonRef}
        type="button"
        onClick={() => setAbierto((a) => !a)}
        aria-haspopup="menu"
        aria-expanded={abierto}
        aria-label={`Menú de ${nombreCompleto}`}
        title={nombreCompleto}
        className={`flex rounded-full p-0.5 transition ring-2 ${abierto ? "ring-orange-400" : "ring-transparent hover:ring-orange-300 dark:hover:ring-orange-500/60"}`}
      >
        <AvatarPerfil fotoUrl={fotoUrl} nombreCompleto={nombreCompleto} iniciales={iniciales} />
      </button>

      {abierto && (
        <div
          role="menu"
          aria-label="Mi cuenta"
          className="absolute right-0 z-40 mt-2 w-72 max-w-[calc(100vw-1.5rem)] origin-top-right overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 animate-[dropdown-in_0.15s_ease-out] dark:bg-neutral-900 dark:ring-white/10"
        >
          <div className="flex items-center gap-3 px-4 pt-4 pb-3.5 bg-gradient-to-br from-orange-100/80 via-orange-50/40 to-transparent dark:from-orange-500/15 dark:via-orange-500/5">
            <AvatarPerfil fotoUrl={fotoUrl} nombreCompleto={nombreCompleto} iniciales={iniciales} grande />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                <p title={nombreCompleto} className="text-[13px] font-semibold text-neutral-900 dark:text-white leading-tight truncate">
                  {nombreCorto || nombreCompleto}
                </p>
                <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-orange-500/15 text-orange-800 dark:text-orange-300 whitespace-nowrap">
                  {etiquetaRol}
                </span>
              </div>
              {empresa && <p className="mt-0.5 text-[11px] text-neutral-500 dark:text-neutral-400 leading-tight truncate">{empresa}</p>}
            </div>
          </div>

          <div className={`grid ${columnas} gap-2 px-3 pt-1 pb-3`}>
            <Cuadro icono={<IconoHuella className="w-[18px] h-[18px]" />} texto="Biometría" tono={TONO_BIOMETRIA} onClick={elegir(onBiometria)} />
            <Cuadro
              icono={oscuro ? <IconoSol className="w-[18px] h-[18px]" /> : <IconoLuna className="w-[18px] h-[18px]" />}
              texto={oscuro ? "Modo claro" : "Modo oscuro"}
              tono={oscuro ? TONO_A_CLARO : TONO_A_OSCURO}
              onClick={alternarTema}
            />
            {linkWhatsApp && (
              <Cuadro
                icono={<IconoWhatsApp className="w-[18px] h-[18px]" />}
                texto="WhatsApp TH"
                tono={TONO_WHATSAPP}
                href={linkWhatsApp}
                onClick={() => setAbierto(false)}
              />
            )}
          </div>

          <div className="px-3 pb-3">
            <button
              type="button"
              role="menuitem"
              onClick={elegir(onCerrarSesion)}
              className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-red-600 bg-red-50 hover:bg-red-100 dark:text-red-400 dark:bg-red-500/10 dark:hover:bg-red-500/20 transition"
            >
              <IconoSalir className="w-4 h-4" /> Cerrar sesión
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
