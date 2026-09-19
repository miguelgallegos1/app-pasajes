import type { NextConfig } from "next";

// El ícono/manifest de la PWA casi no cambian, pero por defecto el navegador
// los revalida en cada carga (una ida y vuelta al servidor, más lenta todavía
// con Vercel/Neon en Brasil) — con este header quedan servidos del caché
// local por un día entero, sin red de por medio. El service worker es al
// revés: nunca se cachea, para que una corrección (como la de public/sw.js)
// le llegue al usuario apenas se publica, no cuando el caché expire.
const CACHE_ESTATICOS = "public, max-age=86400, stale-while-revalidate=604800";

const nextConfig: NextConfig = {
  async headers() {
    return [
      { source: "/logo.png", headers: [{ key: "Cache-Control", value: CACHE_ESTATICOS }] },
      { source: "/pwa-icon-192.png", headers: [{ key: "Cache-Control", value: CACHE_ESTATICOS }] },
      { source: "/pwa-icon-512.png", headers: [{ key: "Cache-Control", value: CACHE_ESTATICOS }] },
      { source: "/pwa-icon-maskable.png", headers: [{ key: "Cache-Control", value: CACHE_ESTATICOS }] },
      { source: "/manifest.webmanifest", headers: [{ key: "Cache-Control", value: CACHE_ESTATICOS }] },
      { source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache" }] },
    ];
  },
};

export default nextConfig;
