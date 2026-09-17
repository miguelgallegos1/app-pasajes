// lib/alertasPendientes.ts
// Cuánto le falta resolver a TH/Coordinación/Nómina en su próximo paso del
// flujo (Aprobar / Revisar / Pagar), sin filtro de fecha a propósito: a
// diferencia del resto del Dashboard, esto es "todo lo que tenés
// pendiente ahora", no un período elegido a mano.

import { db } from "./db";
import { obtenerCondicionRutaTH } from "./alcanceTH";
import type { SesionUsuario } from "./auth";

export type AlertaPendiente = {
  estado: "PENDIENTE" | "APROBADA" | "REVISADO";
  total: number;
  monto: number;
  desglose: { etiqueta: string; cantidad: number }[];
  href: string;
};

// Qué estado representa "lo próximo que le toca resolver" a cada rol, a
// qué pantalla lo manda, y si su alcance está acotado por Empresa/Sitio/
// Área (Nómina ve todo, sin restricción).
const CONFIG_POR_ROL: Record<
  string,
  { estado: AlertaPendiente["estado"]; href: string; conAlcance: boolean }
> = {
  ADMIN_TH: { estado: "PENDIENTE", href: "/th/aprobaciones", conAlcance: true },
  COORDINADOR: { estado: "APROBADA", href: "/coordinador/revision", conAlcance: true },
  NOMINA: { estado: "REVISADO", href: "/nomina/pagos", conAlcance: false },
};

const TOP_AREAS = 5;

export async function obtenerAlertaPendiente(session: SesionUsuario): Promise<AlertaPendiente | null> {
  const config = CONFIG_POR_ROL[session.rol];
  if (!config) return null;

  const { sinRestriccion, condicion } = config.conAlcance
    ? await obtenerCondicionRutaTH(session.id, session.rol)
    : { sinRestriccion: true as const, condicion: {} as Record<string, unknown> };

  if (condicion === null) return null; // sin áreas asignadas todavía

  const filtro = { estado: config.estado, ...(sinRestriccion ? {} : { ruta: condicion }) };

  const [agregado, grupos] = await Promise.all([
    db.solicitudPasaje.aggregate({ where: filtro, _count: true, _sum: { montoTotal: true } }),
    db.solicitudPasaje.groupBy({ by: ["rutaId"], where: filtro, _count: true }),
  ]);

  if (agregado._count === 0) return null;

  const rutaIds = grupos.map((g) => g.rutaId);
  const rutas = rutaIds.length
    ? await db.ruta.findMany({
        where: { id: { in: rutaIds } },
        select: {
          id: true,
          area: { select: { nombre: true, sitio: { select: { nombre: true, empresa: { select: { nombre: true } } } } } },
        },
      })
    : [];
  const etiquetaPorRuta = new Map(
    rutas.map((r) => [r.id, `${r.area.sitio.empresa.nombre} · ${r.area.sitio.nombre} · ${r.area.nombre}`])
  );

  const mapa = new Map<string, number>();
  for (const g of grupos) {
    const etiqueta = etiquetaPorRuta.get(g.rutaId) ?? "Área desconocida";
    mapa.set(etiqueta, (mapa.get(etiqueta) ?? 0) + g._count);
  }

  const entradas = Array.from(mapa.entries())
    .map(([etiqueta, cantidad]) => ({ etiqueta, cantidad }))
    .sort((a, b) => b.cantidad - a.cantidad);
  const resto = entradas.slice(TOP_AREAS).reduce((acc, e) => acc + e.cantidad, 0);
  // Con una sola área en el desglose no aporta nada repetir el total —
  // ahí alcanza con el número grande de arriba.
  const desglose =
    entradas.length <= 1
      ? []
      : [...entradas.slice(0, TOP_AREAS), ...(resto > 0 ? [{ etiqueta: "Otras áreas", cantidad: resto }] : [])];

  return {
    estado: config.estado,
    total: agregado._count,
    monto: Number(agregado._sum.montoTotal ?? 0),
    desglose,
    href: config.href,
  };
}
