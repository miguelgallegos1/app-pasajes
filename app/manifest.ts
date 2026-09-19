// app/manifest.ts
// Manifest de PWA: permite "Agregar a pantalla de inicio" en el celular y
// que la app se abra a pantalla completa, sin la barra de direcciones del
// navegador. Archivo especial de Next.js — no hace falta agregar el
// <link rel="manifest"> a mano, lo inyecta solo.

import type { MetadataRoute } from "next";
import { APP_NOMBRE } from "../lib/config";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: APP_NOMBRE,
    short_name: APP_NOMBRE,
    description: "Sistema de registro y gestión de pasajes corporativos",
    start_url: "/",
    display: "standalone",
    // Blanco (no negro): es el fondo que el sistema operativo muestra un
    // instante al abrir la app instalada, antes de que cargue cualquier
    // CSS — con el ícono ahora armado sobre fondo blanco (ver app/icon.png),
    // esto hace que esa pantalla de arranque se sienta continua en vez de
    // un flash oscuro feo.
    background_color: "#ffffff",
    theme_color: "#f97316",
    icons: [
      { src: "/logo-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/logo.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
