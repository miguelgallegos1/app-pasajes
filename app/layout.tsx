import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ToastProvider } from "../components/Toast";
import ThemeProvider from "../components/ThemeProvider";
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
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          <ToastProvider>{children}</ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
