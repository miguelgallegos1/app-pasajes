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
      // bottom-28 (no bottom-5) para no quedar tapado por
      // TarjetaActualizarDomicilio, que en móvil ocupa todo el ancho de esa
      // misma esquina cuando está visible — right, porque el menú vive a
      // la izquierda. Semi-transparente en reposo (opacity-80) para que no
      // pese sobre el contenido de abajo; se ve completo apenas se le
      // presta atención (hover/tap).
      className="fixed z-40 bottom-28 right-5 w-11 h-11 rounded-full bg-[#25D366] hover:bg-[#20bd5a] text-white flex items-center justify-center shadow-md shadow-black/15 opacity-80 hover:opacity-100 active:opacity-100 transition hover:-translate-y-0.5 hover:shadow-xl"
    >
      <IconoWhatsApp className="w-5 h-5" />
    </a>
  );
}
