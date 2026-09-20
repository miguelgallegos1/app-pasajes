// components/AlertaPendientes.tsx
// Ya no se renderiza ninguna tarjeta acá (vivía en el Dashboard, duplicando
// la campanita del header) — este archivo solo exporta TEMAS, el mapeo de
// colores/ícono/textos por estado que reutiliza NotificacionesMenu.tsx
// para que la alerta se vea igual sin importar dónde aparezca.

import { IconoCheck, IconoLupa, IconoDinero } from "./Icons";
import type { AlertaPendiente } from "../lib/alertasPendientes";

export const TEMAS: Record<
  AlertaPendiente["estado"],
  {
    titulo: string;
    accion: string;
    icono: typeof IconoCheck;
    fondo: string;
    anillo: string;
    badge: string;
    texto: string;
    boton: string;
  }
> = {
  PENDIENTE: {
    titulo: "pendiente de aprobar",
    accion: "Ir a Aprobaciones",
    icono: IconoCheck,
    fondo: "bg-amber-50 dark:bg-amber-500/10",
    anillo: "ring-amber-200 dark:ring-amber-500/30",
    badge: "bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400",
    texto: "text-amber-900 dark:text-amber-300",
    boton: "bg-amber-500 hover:bg-amber-600 text-white",
  },
  APROBADA: {
    titulo: "pendiente de revisar",
    accion: "Ir a Revisión",
    icono: IconoLupa,
    fondo: "bg-green-50 dark:bg-green-500/10",
    anillo: "ring-green-200 dark:ring-green-500/30",
    badge: "bg-green-100 text-green-600 dark:bg-green-500/20 dark:text-green-400",
    texto: "text-green-900 dark:text-green-300",
    boton: "bg-green-600 hover:bg-green-700 text-white",
  },
  REVISADO: {
    titulo: "pendiente de pagar",
    accion: "Ir a Pagos",
    icono: IconoDinero,
    fondo: "bg-sky-50 dark:bg-sky-500/10",
    anillo: "ring-sky-200 dark:ring-sky-500/30",
    badge: "bg-sky-100 text-sky-600 dark:bg-sky-500/20 dark:text-sky-400",
    texto: "text-sky-900 dark:text-sky-300",
    boton: "bg-sky-600 hover:bg-sky-700 text-white",
  },
};
