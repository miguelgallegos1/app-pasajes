// public/sw.js
// Service worker: existe para que el navegador considere la app
// "instalable" (uno de los requisitos de Chrome/Edge para mostrar el
// botón de instalar, junto con el manifest de app/manifest.ts) y para
// mostrar las notificaciones push. No cachea nada a propósito — esta app
// cambia seguido y un cache agresivo podría mostrar contenido viejo o
// interferir con la sesión.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let datos = { title: "Gestión de Pasajes", body: "" };
  if (event.data) {
    try {
      datos = event.data.json();
    } catch {
      datos = { title: "Gestión de Pasajes", body: event.data.text() };
    }
  }
  event.waitUntil(
    Promise.all([
      self.registration.showNotification(datos.title || "Gestión de Pasajes", {
        body: datos.body || "",
        icon: "/logo.png",
        badge: "/logo.png",
        data: { url: datos.url || "/" },
      }),
      // Si la app ya está abierta en alguna pestaña, le avisa para que
      // refresque la campanita al toque — sin esto, el cambio recién se
      // ve si el usuario recarga la página entera.
      self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((lista) => {
        lista.forEach((cliente) => cliente.postMessage({ type: "push-recibido" }));
      }),
    ])
  );
});

// Al tocar la notificación: si ya hay una pestaña abierta con la app, la
// enfoca en vez de abrir una nueva.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((lista) => {
      for (const cliente of lista) {
        if (cliente.url.includes(url) && "focus" in cliente) return cliente.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
