// components/Footer.tsx
// Pie de página del shell interno: versión de la app.

import { APP_VERSION } from "../lib/config";

export default function Footer() {
  return (
    <footer className="text-center text-[11px] text-neutral-500 dark:text-neutral-600 py-4 border-t border-neutral-200 dark:border-neutral-900">
      v{APP_VERSION}
    </footer>
  );
}
