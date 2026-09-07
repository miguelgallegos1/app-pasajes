// lib/config.ts
// Datos generales de la app, centralizados para no repetirlos por todo el código.

export const APP_NOMBRE = "Gestión de Pasajes";
export const APP_VERSION = "1.0.0";
export const APP_DESARROLLADOR = "Miguel Gallegos";

// La sesión dura esto sin actividad; cada visita a una página protegida
// la renueva (ver proxy.ts). Pasado este tiempo sin actividad, expira.
export const DURACION_SESION_SEGUNDOS = 60 * 30;