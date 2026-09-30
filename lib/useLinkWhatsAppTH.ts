// lib/useLinkWhatsAppTH.ts
// Link para que el colaborador contacte a Talento Humano por WhatsApp
// directo (no es un chat dentro de la app: abre WhatsApp con el número de
// su Área/Sitio/Empresa ya cargado y un mensaje precargado). Devuelve null
// si nadie configuró ningún número en toda esa cadena (o mientras carga),
// para no mostrar un botón muerto. Lo usa el menú de usuario del header
// (components/MenuUsuario.tsx). `activo` en false no consulta nada: para
// roles que no son Colaborador.

"use client";

import { useEffect, useState } from "react";

export function useLinkWhatsAppTH(activo = true): string | null {
  const [numero, setNumero] = useState<string | null>(null);

  useEffect(() => {
    if (!activo) return;
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
  }, [activo]);

  if (!activo || !numero) return null;
  const mensaje = encodeURIComponent("Hola, tengo una consulta sobre mis pasajes.");
  return `https://wa.me/${numero}?text=${mensaje}`;
}
