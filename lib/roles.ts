// lib/roles.ts
// Roles administrativos centralizados: etiqueta para mostrar en pantalla y
// ruta de inicio tras el login. Antes estaban duplicados por separado en
// app/page.tsx, app/login/page.tsx y proxy.ts — un solo lugar evita que se
// desincronicen entre sí cuando se agrega o renombra un rol.
// Importable tanto desde componentes de servidor como de cliente (sin
// dependencias de Node), así que no requiere "use client".

export const ETIQUETAS_ROL: Record<string, string> = {
  SUPER_ADMIN: "Super Administrador",
  ADMIN_TH: "Talento Humano",
  COORDINADOR: "Coordinador",
  NOMINA: "Nómina",
};

export const INICIO_POR_ROL: Record<string, string> = {
  COLABORADOR: "/mis-pasajes",
  ADMIN_TH: "/dashboard",
  COORDINADOR: "/dashboard",
  NOMINA: "/dashboard",
  SUPER_ADMIN: "/dashboard",
};
