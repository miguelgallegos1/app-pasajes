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
    // CSS — con el ícono de abajo armado sobre fondo blanco, esto hace que
    // esa pantalla de arranque se sienta continua en vez de un flash
    // oscuro feo.
    //
    // Los archivos "pwa-icon-*" son EXCLUSIVOS de la instalación/splash —
    // no son los mismos que /logo.png (que usan el login y el menú, con
    // su propia sombra por CSS y sin fondo). Si algún día hace falta
    // regenerarlos, no tocar public/logo.png.
    background_color: "#ffffff",
    theme_color: "#f97316",
    icons: [
      { src: "/pwa-icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/pwa-icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      // Android recorta este en la forma que use el launcher (círculo,
      // squircle, etc.) — a diferencia de los "any" de arriba, este va a
      // todo el lienzo, sin margen propio, así no aparece una segunda
      // caja blanca alrededor cuando el sistema le aplica su máscara.
      { src: "/pwa-icon-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
