// lib/contadorMenu.ts
// Número que se muestra en el menú al lado de la pantalla donde está el
// trabajo pendiente de cada rol (reemplaza a la antigua campanita):
//   TH -> Bandeja de aprobaciones (PENDIENTE, en su alcance)
//   Coordinación -> Bandeja de revisiones (APROBADA, en su alcance)
//   Nómina -> Bandeja de pagos (REVISADO, todo)
//   Colaborador -> Registrar (sus RECHAZADAS por corregir y las de su equipo)
// Solo un COUNT (sin desglose ni montos): es lo único que se muestra, y
// se pide al entrar y cada pocos minutos, así que tiene que ser liviano.

import { db } from "./db";
import { obtenerCondicionRutaTH } from "./alcanceTH";
import type { SesionUsuario } from "./auth";

const ESTADO_POR_ROL: Record<string, { estado: "PENDIENTE" | "APROBADA" | "REVISADO"; conAlcance: boolean }> = {
  ADMIN_TH: { estado: "PENDIENTE", conAlcance: true },
  COORDINADOR: { estado: "APROBADA", conAlcance: true },
  NOMINA: { estado: "REVISADO", conAlcance: false },
};

export async function contarPendientesMenu(session: SesionUsuario): Promise<number> {
  if (session.rol === "COLABORADOR") {
    // Mismo alcance que Registrar (mis-pasajes/datos): las propias y las
    // del equipo activo si es supervisor — en una sola consulta.
    return db.solicitudPasaje.count({
      where: {
        estado: "RECHAZADA",
        colaborador: { OR: [{ usuarioId: session.id }, { estado: "ACTIVO", supervisor: { usuarioId: session.id } }] },
      },
    });
  }

  const config = ESTADO_POR_ROL[session.rol];
  if (!config) return 0;

  const { sinRestriccion, condicion } = config.conAlcance
    ? await obtenerCondicionRutaTH(session.id, session.rol)
    : { sinRestriccion: true as const, condicion: {} as Record<string, unknown> };
  if (condicion === null) return 0; // sin áreas asignadas todavía

  return db.solicitudPasaje.count({
    where: { estado: config.estado, ...(sinRestriccion ? {} : { ruta: condicion }) },
  });
}
