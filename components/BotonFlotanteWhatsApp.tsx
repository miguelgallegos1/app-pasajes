// components/BotonFlotanteWhatsApp.tsx
// Botón flotante para que el colaborador contacte a Talento Humano por
// WhatsApp directo (no es un chat dentro de la app: abre WhatsApp con el
// número de su Área/Sitio/Empresa ya cargado y un mensaje precargado). Se
// oculta solo si nadie configuró ningún número en toda esa cadena, para no
// mostrar un botón muerto.

"use client";

import { useEffect, useState } from "react";
import { IconoWhatsApp } from "./Icons";

export default function BotonFlotanteWhatsApp() {
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

  return (
    <a
      href={`https://wa.me/${numero}?text=${mensaje}`}
      target="_blank"
      rel="noopener noreferrer"
      title="Contactar a Talento Humano por WhatsApp"
      className="fixed z-40 bottom-5 left-5 w-14 h-14 rounded-full bg-[#25D366] hover:bg-[#20bd5a] text-white flex items-center justify-center shadow-lg shadow-black/20 transition hover:-translate-y-0.5 hover:shadow-xl"
    >
      <IconoWhatsApp className="w-7 h-7" />
    </a>
  );
}
