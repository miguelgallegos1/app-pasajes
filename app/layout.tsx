import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ToastProvider } from "../components/Toast";
import ThemeProvider from "../components/ThemeProvider";
import SplashPWA from "../components/SplashPWA";
import "./globals.css";

// Se ejecuta antes de pintar la página: decide "dark" u "light" (localStorage,
// o si no hay nada guardado, la preferencia del sistema) y lo aplica de una
// vez en <html>, para que no haya parpadeo del tema equivocado al cargar.
const SCRIPT_TEMA_INICIAL = `
(function () {
  try {
    var guardado = localStorage.getItem("tema");
    var esOscuro = guardado === "dark" || (guardado !== "light" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    if (esOscuro) document.documentElement.classList.add("dark");
  } catch (e) {}
})();
`;

// Detecta si se abrió como app instalada (no una pestaña normal del
// navegador) ANTES de pintar, para poder mostrar la pantalla de carga de
// abajo solo ahí — en una pestaña normal no hace falta.
const SCRIPT_DETECTAR_PWA = `
(function () {
  try {
    var esPWA = (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) || window.navigator.standalone === true;
    if (esPWA) document.documentElement.classList.add("es-pwa");
  } catch (e) {}
})();
`;

// Registra el service worker (public/sw.js) — sin él, Chrome/Edge no
// ofrecen instalar la app aunque el manifest esté bien armado. Solo en
// producción: en desarrollo un SW puede quedar cacheado entre reinicios
// del server y mostrar código viejo, sin ningún beneficio a cambio.
const SCRIPT_SERVICE_WORKER =
  process.env.NODE_ENV === "production"
    ? `
if ("serviceWorker" in navigator) {
  window.addEventListener("load", function () {
    navigator.serviceWorker.register("/sw.js").catch(function () {});
  });
}
`
    : "";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Gestión de Pasajes",
  description: "Sistema de registro y gestión de pasajes corporativos",
  // Al abrirla desde "Agregar a pantalla de inicio" en iOS, la lanza a
  // pantalla completa (sin la barra de Safari) — Android/Chrome toman
  // esto mismo del manifest.ts, pero Safari solo respeta estas meta tags.
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Pasajes",
  },
  // appleWebApp.capable ya genera "mobile-web-app-capable" (el nombre
  // nuevo, sin el prefijo), pero versiones de iOS/Safari más viejas solo
  // reconocen el nombre con el prefijo "apple-" — sin este, "Agregar a
  // pantalla de inicio" en esos iPhone agrega un simple acceso directo
  // que abre Safari con la barra de direcciones, no la app instalada a
  // pantalla completa.
  other: {
    "apple-mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_TEMA_INICIAL }} />
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_DETECTAR_PWA }} />
        <style>{`#app-splash{display:none}html.es-pwa #app-splash{display:flex}`}</style>
        {SCRIPT_SERVICE_WORKER && <script dangerouslySetInnerHTML={{ __html: SCRIPT_SERVICE_WORKER }} />}
      </head>
      <body className="min-h-full flex flex-col">
        {/* Mismo ícono que muestra el splash nativo del sistema (para que
            se sienta continuo, sin "saltar"), con el nombre y la carga
            debajo desde el principio — nada de etapas ni ícono que
            reaparece después. El desmontado lo maneja React (ver
            SplashPWA), no un script que saque el nodo a mano. */}
        <SplashPWA />
        <ThemeProvider>
          <ToastProvider>{children}</ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
