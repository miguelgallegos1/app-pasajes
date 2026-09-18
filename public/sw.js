// public/sw.js
// Service worker mínimo: existe solo para que el navegador considere la
// app "instalable" (uno de los requisitos de Chrome/Edge para mostrar el
// botón de instalar, junto con el manifest de app/manifest.ts). No cachea
// nada a propósito — esta app cambia seguido y un cache agresivo podría
// mostrar contenido viejo o interferir con la sesión.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {
  // No-op: deja pasar todos los pedidos directo a la red, sin cache.
});
