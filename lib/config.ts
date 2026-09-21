// lib/config.ts
// Datos generales de la app, centralizados para no repetirlos por todo el código.

export const APP_NOMBRE = "Gestión de Pasajes";
export const APP_VERSION = "3.0.0";
export const APP_DESARROLLADOR = "Miguel Gallegos Calderón";

// La sesión dura esto sin actividad; cada visita a una página protegida
// la renueva (ver proxy.ts). Pasado este tiempo sin actividad, expira.
export const DURACION_SESION_SEGUNDOS = 60 * 30;

// Valor de arranque de "días atrás" del calendario de nueva solicitud,
// mientras el valor real (editable en Admin -> Parámetros, ver
// lib/parametros.ts) todavía no llegó del servidor. Coincide con el
// límite que estaba quemado en el código antes de hacerse configurable.
export const DIAS_ATRAS_SOLICITUD_DEFECTO = 2;