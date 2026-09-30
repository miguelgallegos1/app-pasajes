// components/MenuUsuario.tsx
// Avatar del header que abre la tarjeta de perfil: foto/iniciales grandes,
// nombre y empresa (el rol, en una etiqueta en la esquina), accesos rápidos en cuadros (Acceso biométrico, Tema y —
// solo Colaborador, si TH configuró un número — WhatsApp a TH) y Cerrar
// sesión abajo. Reemplaza al nombre + sol/luna + avatar sueltos que había
// en el header; el menú lateral queda igual. Se cierra con clic afuera,
// con Escape o al elegir una opción.

"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useTema } from "./ThemeProvider";
import { useLinkWhatsAppTH } from "./BotonWhatsApp";
import { IconoHuella, IconoLuna, IconoSalir, IconoSol, IconoWhatsApp } from "./Icons";

function AvatarPerfil({ fotoUrl, nombreCompleto, iniciales, grande }: { fotoUrl?: string | null; nombreCompleto: string; iniciales: string; grande?: boolean }) {
  const tam = grande ? "w-14 h-14 text-lg" : "w-8 h-8 text-xs";
  return fotoUrl ? (
    // <img>, no <Image>: mismo motivo que el Avatar de AppShell.tsx.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={fotoUrl} alt={nombreCompleto} className={`${tam} rounded-full object-cover shrink-0`} />
  ) : (
    <span className={`${tam} rounded-full bg-orange-500 text-black font-bold flex items-center justify-center shrink-0`}>{iniciales}</span>
  );
}

function Cuadro({ icono, texto, onClick, href, className = "" }: { icono: ReactNode; texto: string; onClick?: () => void; href?: string; className?: string }) {
  const clases = `flex flex-col items-center justify-center gap-1.5 rounded-xl border border-neutral-200 dark:border-neutral-800 px-1 py-3 text-[11px] font-medium text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 hover:border-neutral-300 dark:hover:bg-neutral-800/70 dark:hover:border-neutral-700 transition ${className}`;
  return href ? (
    <a href={href} target="_blank" rel="noopener noreferrer" role="menuitem" onClick={onClick} className={clases}>
      {icono}
      {texto}
    </a>
  ) : (
    <button type="button" role="menuitem" onClick={onClick} className={clases}>
      {icono}
      {texto}
    </button>
  );
}

export default function MenuUsuario({
  nombreCompleto,
  iniciales,
  fotoUrl,
  empresa,
  etiquetaRol,
  esColaborador,
  onBiometria,
  onCerrarSesion,
}: {
  nombreCompleto: string;
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
          <div className="relative flex flex-col items-center gap-1.5 px-4 pt-7 pb-4 text-center bg-gradient-to-b from-orange-100/80 to-transparent dark:from-orange-500/15">
            {/* El rol va aparte, no debajo del nombre (ahí solo la empresa):
                es la única parte de la app donde se ve. */}
            <span className="absolute left-3 top-3 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-800 dark:text-orange-300">
              {etiquetaRol}
            </span>
            <AvatarPerfil fotoUrl={fotoUrl} nombreCompleto={nombreCompleto} iniciales={iniciales} grande />
            <p className="mt-1 text-sm font-semibold text-neutral-900 dark:text-white leading-tight">{nombreCompleto}</p>
            {empresa && <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-tight">{empresa}</p>}
          </div>

          <div className={`grid ${columnas} gap-2 px-3 pb-3`}>
            <Cuadro icono={<IconoHuella className="w-5 h-5 text-neutral-500 dark:text-neutral-400" />} texto="Biometría" onClick={elegir(onBiometria)} />
            <Cuadro
              icono={oscuro ? <IconoSol className="w-5 h-5 text-neutral-500 dark:text-neutral-400" /> : <IconoLuna className="w-5 h-5 text-neutral-500 dark:text-neutral-400" />}
              texto={oscuro ? "Modo claro" : "Modo oscuro"}
              onClick={alternarTema}
            />
            {linkWhatsApp && (
              <Cuadro
                icono={<IconoWhatsApp className="w-5 h-5 text-[#25D366]" />}
                texto="WhatsApp TH"
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
