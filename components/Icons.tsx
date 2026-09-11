// components/Icons.tsx
// Íconos SVG simples y livianos, sin depender de ninguna librería externa
// (evitamos instalar paquetes nuevos que puedan dar problemas).

export function IconoBuseta({ className = "w-7 h-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth={2}>
      <path
        d="M4 16V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M4 11h16" strokeLinecap="round" />
      <circle cx="7.5" cy="19" r="1.5" />
      <circle cx="16.5" cy="19" r="1.5" />
    </svg>
  );
}

export function IconoControl({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth={2}>
      <rect x="4" y="3" width="16" height="18" rx="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 8h8M8 12h8M8 16h5" strokeLinecap="round" />
    </svg>
  );
}

export function IconoCopiar({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth={2}>
      <rect x="9" y="9" width="12" height="12" rx="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconoHuella({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth={2}>
      <path
        d="M7 15.5c.8-1.4 1.3-3 1.3-4.7A3.7 3.7 0 0 1 12 7a3.7 3.7 0 0 1 3.7 3.8c0 .6-.05 1.2-.15 1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M4.5 12a7.5 7.5 0 0 1 14.9-1.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9.5 18a8 8 0 0 1-1.8-3.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 21c-2-1.4-3.5-3-4.3-5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15.2 20a12 12 0 0 1-2.4-6.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M17.5 17.5a10.5 10.5 0 0 1-1.8-6.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconoSalir({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth={2}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 17l5-5-5-5M21 12H9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconoCalendario({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth={2}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" strokeLinecap="round" />
    </svg>
  );
}
export function IconoCheck({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth={2}>
      <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconoReloj({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconoPersonas({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth={2}>
      <circle cx="9" cy="8" r="3" />
      <path d="M2 20c0-3.3 3.1-6 7-6s7 2.7 7 6" strokeLinecap="round" />
      <circle cx="17" cy="8" r="2.5" />
      <path d="M22 20c0-2.6-2-4.8-4.8-5.6" strokeLinecap="round" />
    </svg>
  );
}

export function IconoRuta({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth={2}>
      <circle cx="6" cy="6" r="2" />
      <circle cx="18" cy="18" r="2" />
      <path d="M6 8v4a4 4 0 0 0 4 4h4" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="2 2" />
    </svg>
  );
}

export function IconoDinero({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v10M9.5 9.5c0-1.4 1.1-2 2.5-2s2.5.7 2.5 1.8c0 2.4-5 1-5 3.4 0 1.1 1.1 1.8 2.5 1.8s2.5-.6 2.5-2" strokeLinecap="round" />
    </svg>
  );
}

export function IconoEdificio({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth={2}>
      <rect x="4" y="3" width="16" height="18" rx="1" />
      <path d="M9 7h1M14 7h1M9 11h1M14 11h1M9 15h1M14 15h1" strokeLinecap="round" />
    </svg>
  );
}

export function IconoUsuario({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-3.9 3.6-7 8-7s8 3.1 8 7" strokeLinecap="round" />
    </svg>
  );
}

export function IconoGrafico({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth={2}>
      <path d="M4 20V10M12 20V4M20 20v-7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconoChevron({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth={2}>
      <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconoDescargar({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth={2}>
      <path d="M12 4v11m0 0 4-4m-4 4-4-4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 19h16" strokeLinecap="round" />
    </svg>
  );
}