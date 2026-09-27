// lib/filtroUbicacion.ts
// Filtro Empresa/Sitio/Área de los historiales (por la ubicación de la
// RUTA de cada solicitud), combinado con el alcance asignado del usuario:
// elegir un área de otro sitio no "escapa" del alcance, porque ambas
// condiciones se exigen juntas (AND).

// El nivel más específico que venga en los parámetros (área > sitio >
// empresa), o null si no se eligió ninguno.
export function ubicacionDesdeParams(sp: URLSearchParams): Record<string, string> | null {
  const areaId = sp.get("areaId");
  const sitioId = sp.get("sitioId");
  const empresaId = sp.get("empresaId");
  if (areaId) return { areaId };
  if (sitioId) return { sitioId };
  if (empresaId) return { empresaId };
  return null;
}

// Condición `ruta` para el where de SolicitudPasaje: alcance del usuario
// (salvo sinRestriccion) Y la ubicación elegida. Devuelve {} si no hay
// ninguna de las dos, para poder hacer `...condicionRuta(...)`.
export function condicionRuta(
  sinRestriccion: boolean,
  alcance: Record<string, unknown> | null,
  ubicacion: Record<string, string> | null
): { ruta?: Record<string, unknown> } {
  const partes: Record<string, unknown>[] = [];
  if (!sinRestriccion && alcance) partes.push(alcance);
  if (ubicacion) partes.push(ubicacion);
  if (partes.length === 0) return {};
  return { ruta: partes.length === 1 ? partes[0] : { AND: partes } };
}
