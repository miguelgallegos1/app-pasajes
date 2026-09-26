// lib/novedades.ts
// Novedades de la app (solo funciones nuevas), mostradas en /novedades y
// como aviso flotante la primera vez que cada usuario entra después de
// publicarse. Viven en este archivo, NO en la base de datos: no hay
// consultas ni endpoints — se publican con el mismo despliegue que trae
// la función nueva.
//
// Para publicar una novedad: agregarla ARRIBA de la lista con un `id`
// único que no se reutilice (así el aviso flotante sabe si ya se vio) y
// la fecha de publicación. Deja de mostrarse sola pasados
// DIAS_VIGENCIA_NOVEDAD días; se puede borrar de la lista después.
//
// `roles`: a quiénes les sirve (si se omite, a todos). SUPER_ADMIN ve
// siempre todas.

export const DIAS_VIGENCIA_NOVEDAD = 30;

export type Novedad = {
  id: string;
  fecha: string; // "YYYY-MM-DD", día de publicación
  titulo: string;
  descripcion: string;
  roles?: string[];
};

export const NOVEDADES: Novedad[] = [
  {
    id: "2026-09-orden-historiales",
    fecha: "2026-09-26",
    titulo: "Ordenar en los historiales ahora ordena todo",
    descripcion:
      "Al hacer clic en una columna (Fecha, Colaborador, Ruta, Valor o Estado) se ordenan todos los registros del rango, no solo la página que estás viendo.",
    roles: ["ADMIN_TH", "COORDINADOR", "NOMINA", "JEFE", "COLABORADOR"],
  },
  {
    id: "2026-09-seleccionar-todas",
    fecha: "2026-09-25",
    titulo: "Seleccionar todas para procesar en bloque",
    descripcion:
      "El botón \"Seleccionar todas (N)\" marca todas las solicitudes que cumplen los filtros, de todas las páginas, para aprobar, revisar o pagar en un solo clic. Si alguna cambió de estado mientras tanto, se avisa cuál no se procesó.",
    roles: ["ADMIN_TH", "COORDINADOR", "NOMINA"],
  },
  {
    id: "2026-09-excel-historiales",
    fecha: "2026-09-25",
    titulo: "Excel de historiales más completo",
    descripcion:
      "Las descargas incluyen Empresa, Sitio, Área, código del colaborador y quién aprobó, revisó y pagó. El historial de Nómina se descarga consolidado por colaborador, y Talento Humano ya puede exportar su historial.",
    roles: ["ADMIN_TH", "COORDINADOR", "NOMINA"],
  },
  {
    id: "2026-09-codigo-y-responsables",
    fecha: "2026-09-25",
    titulo: "Código del colaborador y responsables en las tablas",
    descripcion:
      "La columna Código muestra el código de nómina del colaborador, y las tablas indican quién aprobó, revisó o pagó cada solicitud.",
    roles: ["ADMIN_TH", "COORDINADOR", "NOMINA"],
  },
  {
    id: "2026-09-carga-masiva-todo-o-nada",
    fecha: "2026-09-25",
    titulo: "Carga masiva sin registros a medias",
    descripcion:
      "Si el Excel de colaboradores o rutas tiene algún error, no se guarda nada y se listan las filas a corregir. Así no quedan colaboradores creados sin ver su PIN.",
    roles: ["SUPER_ADMIN"],
  },
];

const MS_DIA = 24 * 60 * 60 * 1000;

// Vigentes (publicadas hace menos de DIAS_VIGENCIA_NOVEDAD días) y
// dirigidas a este rol, de la más nueva a la más vieja. Se calcula en el
// servidor dentro del layout (sin consultas, solo filtrar este array).
export function novedadesVigentes(rol: string, ahora = Date.now()): Novedad[] {
  return NOVEDADES.filter((n) => {
    const publicada = new Date(`${n.fecha}T00:00:00-05:00`).getTime();
    const vigente = ahora >= publicada && ahora - publicada < DIAS_VIGENCIA_NOVEDAD * MS_DIA;
    const paraEsteRol = rol === "SUPER_ADMIN" || !n.roles || n.roles.includes(rol);
    return vigente && paraEsteRol;
  }).sort((a, b) => b.fecha.localeCompare(a.fecha));
}
