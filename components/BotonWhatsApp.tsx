// components/BotonWhatsApp.tsx
// Botón para que el colaborador contacte a Talento Humano por WhatsApp
// directo (no es un chat dentro de la app: abre WhatsApp con el número de
// su Área/Sitio/Empresa ya cargado y un mensaje precargado). Se oculta
// solo si nadie configuró ningún número en toda esa cadena, para no
// mostrar un botón muerto.
//
// Dos variantes (ver AppShell.tsx):
// - "icono" (por defecto): círculo de 32px, ocupa el lugar del Avatar en
//   la esquina inferior izquierda del menú de escritorio.
// - "fila": renglón con ícono + texto, igual que "Acceso biométrico" y
//   "Cerrar sesión" en el cajón de menú de móvil (que no tiene Avatar).

"use client";

import { useEffect, useState } from "react";
import { IconoWhatsApp } from "./Icons";

export default function BotonWhatsApp({
  variante = "icono",
  onClick,
}: {
  variante?: "icono" | "fila";
  onClick?: () => void;
}) {
  const [numero, setNumero] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    fetch("/api/mis-pasajes/whatsapp-th")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { whatsapp: string | null } | null) => {
        if (!cancelado && data) setNumero(data.whatsapp);
      })
      .catch(() => {});
    return () => {
      cancelado = true;
    };
  }, []);

  if (!numero) return null;

  const mensaje = encodeURIComponent("Hola, tengo una consulta sobre mis pasajes.");
  const href = `https://wa.me/${numero}?text=${mensaje}`;

  if (variante === "fila") {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onClick}
        className="flex items-center gap-2 text-sm text-neutral-500 hover:text-[#25D366] hover:bg-neutral-100 dark:text-neutral-400 dark:hover:text-[#25D366] dark:hover:bg-neutral-900 rounded-lg px-3 py-2.5 transition"
      >
        <IconoWhatsApp className="w-4 h-4" /> WhatsApp
      </a>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title="Contactar a Talento Humano por WhatsApp"
      className="w-8 h-8 rounded-full bg-[#25D366] hover:bg-[#20bd5a] text-white flex items-center justify-center shrink-0 transition"
    >
      <IconoWhatsApp className="w-4 h-4" />
    </a>
  );
}
