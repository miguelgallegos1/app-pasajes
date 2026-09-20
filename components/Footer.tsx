// components/Footer.tsx
// Pie de página del shell interno: desarrollador y versión de la app, más
// el botón de WhatsApp para colaboradores (ver BotonWhatsApp.tsx).

import { APP_VERSION, APP_DESARROLLADOR } from "../lib/config";
import BotonWhatsApp from "./BotonWhatsApp";

export default function Footer({ mostrarWhatsapp = false }: { mostrarWhatsapp?: boolean }) {
  return (
    <footer className="flex items-center justify-center gap-3 text-[11px] text-neutral-500 dark:text-neutral-600 py-4 border-t border-neutral-200 dark:border-neutral-900">
      <span>
        Desarrollado por <span className="font-bold">{APP_DESARROLLADOR}</span> · v{APP_VERSION}
      </span>
      {mostrarWhatsapp && <BotonWhatsApp />}
    </footer>
  );
}
