// components/ThemeProvider.tsx
// Contexto de tema claro/oscuro. Por defecto sigue la preferencia del
// sistema operativo; si el usuario lo cambia con el selector del header,
// esa elección se guarda en localStorage y ya no sigue al sistema.
// El valor inicial real (antes del primer render) lo aplica un script
// bloqueante en app/layout.tsx para evitar el parpadeo del tema equivocado.

"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Tema = "light" | "dark";

const ThemeContext = createContext<{ tema: Tema; alternarTema: () => void } | null>(null);

export function useTema() {
  const contexto = useContext(ThemeContext);
  if (!contexto) throw new Error("useTema debe usarse dentro de <ThemeProvider>");
  return contexto;
}

function leerTemaActual(): Tema {
  if (typeof document === "undefined") return "dark";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  // El script inline de app/layout.tsx ya dejó la clase "dark" correcta en
  // <html> antes de este primer render, así que leerla de ahí evita un
  // segundo cálculo que podría no coincidir (y provocar un parpadeo).
  const [tema, setTema] = useState<Tema>(leerTemaActual);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", tema === "dark");
  }, [tema]);

  const alternarTema = () => {
    setTema((actual) => {
      const nuevo: Tema = actual === "dark" ? "light" : "dark";
      try {
        window.localStorage.setItem("tema", nuevo);
      } catch {
        // Si localStorage no está disponible (privado/bloqueado), el tema
        // igual cambia para esta sesión, solo no se recuerda para la próxima.
      }
      return nuevo;
    });
  };

  return <ThemeContext.Provider value={{ tema, alternarTema }}>{children}</ThemeContext.Provider>;
}
