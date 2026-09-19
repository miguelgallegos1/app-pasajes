// components/Footer.tsx
// Pie de página del shell interno: desarrollador y versión de la app.

import { APP_VERSION, APP_DESARROLLADOR } from "../lib/config";

export default function Footer() {
  return (
    <footer className="text-center text-[11px] text-neutral-500 dark:text-neutral-600 py-4 border-t border-neutral-200 dark:border-neutral-900">
      Desarrollado por <span className="font-bold">{APP_DESARROLLADOR}</span> · v{APP_VERSION}
    </footer>
  );
}
