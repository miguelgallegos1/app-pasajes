// components/NotificacionesPush.tsx
// Banner en "Mis Pasajes" que ofrece activar notificaciones push (avisar
// apenas una solicitud cambie de estado). Se muestra solo si el navegador
// las soporta y todavía no se decidió nada (ni aceptó ni rechazó el
// permiso) — una vez que hay una respuesta, no vuelve a insistir.

"use client";

import { useState } from "react";
import { useToast } from "./Toast";
import { IconoCampana } from "./Icons";

function base64UrlABytes(base64Url: string): Uint8Array {
  const relleno = "=".repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + relleno).replace(/-/g, "+").replace(/_/g, "/");
  const binario = atob(base64);
  const bytes = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
  return bytes;
}

// Soporte del navegador y estado del permiso ya son conocidos de entrada
// (no hace falta esperar a un efecto) — se leen una sola vez al montar
// con un inicializador perezoso, igual que el resto de la app lee
// window.location.search sin useSearchParams.
function soportaPush() {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

export default function NotificacionesPush() {
  const toast = useToast();
  const [disponible] = useState(soportaPush);
  const [permiso, setPermiso] = useState<NotificationPermission | null>(() => (soportaPush() ? Notification.permission : null));
  const [activando, setActivando] = useState(false);

  const activar = async () => {
    setActivando(true);
    try {
      const permisoNuevo = await Notification.requestPermission();
      setPermiso(permisoNuevo);
      if (permisoNuevo !== "granted") return;

      const clave = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!clave) {
        toast.error("Las notificaciones no están disponibles todavía");
        return;
      }

      const registro = await navigator.serviceWorker.ready;
      const suscripcion =
        (await registro.pushManager.getSubscription()) ??
        (await registro.pushManager.subscribe({
          userVisibleOnly: true,
          // El tipado de lib.dom (BufferSource) exige un ArrayBuffer "puro"
          // y no el genérico ArrayBufferLike que devuelve Uint8Array — en
          // tiempo de ejecución es exactamente lo que el navegador espera.
          applicationServerKey: base64UrlABytes(clave) as BufferSource,
        }));

      const json = suscripcion.toJSON();
      await fetch("/api/notificaciones/suscribir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
      });
      toast.exito("Notificaciones activadas");
    } catch {
      toast.error("No se pudieron activar las notificaciones");
    } finally {
      setActivando(false);
    }
  };

  if (!disponible || permiso !== "default") return null;

  return (
    <div className="bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20 rounded-xl px-4 py-3 flex items-center gap-3">
      <IconoCampana className="w-5 h-5 text-orange-600 dark:text-orange-400 shrink-0" />
      <p className="flex-1 text-sm text-orange-800 dark:text-orange-300">
        Activá las notificaciones para enterarte apenas cambie el estado de tus solicitudes.
      </p>
      <button
        onClick={activar}
        disabled={activando}
        className="shrink-0 text-xs font-semibold bg-orange-500 hover:bg-orange-600 text-white px-3 py-2 rounded-lg transition disabled:opacity-50"
      >
        {activando ? "Activando..." : "Activar"}
      </button>
    </div>
  );
}
