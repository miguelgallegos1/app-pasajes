// lib/contadorMenu.ts
// Números que se muestran en el menú al lado de la pantalla donde está el
// trabajo pendiente (reemplazan a la antigua campanita), por href:
//   TH -> Bandeja de aprobaciones (PENDIENTE, en su alcance) y su
//         Registrar (RECHAZADAS de su propia ficha, las que puede corregir)
//   Coordinación -> Bandeja de revisiones (APROBADA, en su alcance)
//   Nómina -> Bandeja de pagos (REVISADO, todo)
//   Colaborador -> Registrar (sus RECHAZADAS y las de su equipo)
// Solo COUNT (sin desglose ni montos): es lo único que se muestra, y se
// pide al entrar y cada pocos minutos, así que tiene que ser liviano.

import { db } from "./db";
import { obtenerCondicionRutaTH } from "./alcanceTH";
import { obtenerFichaPropiaId, type SesionUsuario } from "./auth";

const BANDEJA_POR_ROL: Record<string, { href: string; estado: "PENDIENTE" | "APROBADA" | "REVISADO"; conAlcance: boolean }> = {
  ADMIN_TH: { href: "/th/aprobaciones", estado: "PENDIENTE", conAlcance: true },
  COORDINADOR: { href: "/coordinador/revision", estado: "APROBADA", conAlcance: true },
  NOMINA: { href: "/nomina/pagos", estado: "REVISADO", conAlcance: false },
};

async function contarBandeja(session: SesionUsuario): Promise<Record<string, number>> {
  const config = BANDEJA_POR_ROL[session.rol];
  if (!config) return {};
  const { sinRestriccion, condicion } = config.conAlcance
    ? await obtenerCondicionRutaTH(session.id, session.rol)
    : { sinRestriccion: true as const, condicion: {} as Record<string, unknown> };
  if (condicion === null) return {}; // sin áreas asignadas todavía
  const total = await db.solicitudPasaje.count({
    where: { estado: config.estado, ...(sinRestriccion ? {} : { ruta: condicion }) },
  });
  return { [config.href]: total };
}

// Registrar de TH: igual que su pantalla, solo cuenta las rechazadas de su
// propia ficha (las que registró para otros son de solo lectura).
async function contarRegistrarTH(session: SesionUsuario): Promise<Record<string, number>> {
  if (session.rol !== "ADMIN_TH") return {};
  const fichaId = await obtenerFichaPropiaId(session);
  if (!fichaId) return {};
  const total = await db.solicitudPasaje.count({ where: { estado: "RECHAZADA", colaboradorId: fichaId } });
  return { "/th/mis-solicitudes": total };
}

export async function contarPendientesMenu(session: SesionUsuario): Promise<Record<string, number>> {
  if (session.rol === "COLABORADOR") {
    // Mismo alcance que Registrar (mis-pasajes/datos): las propias y las
    // del equipo activo si es supervisor — en una sola consulta.
    const total = await db.solicitudPasaje.count({
      where: {
        estado: "RECHAZADA",
        colaborador: { OR: [{ usuarioId: session.id }, { estado: "ACTIVO", supervisor: { usuarioId: session.id } }] },
      },
    });
    return { "/mis-pasajes": total };
  }

  const [bandeja, registrar] = await Promise.all([contarBandeja(session), contarRegistrarTH(session)]);
  return { ...bandeja, ...registrar };
}
