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
    background_color: "#0a0a0a",
    theme_color: "#f97316",
    icons: [
      { src: "/logo.png", sizes: "480x480", type: "image/png", purpose: "any" },
    ],
  };
}
