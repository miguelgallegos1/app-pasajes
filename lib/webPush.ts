// lib/webPush.ts
// Envía notificaciones push (Web Push / VAPID) a todos los dispositivos
// donde un colaborador activó notificaciones. Nunca bloquea ni hace
// fallar la acción que la llama (aprobar, rechazar, etc.) — si el envío
// falla, o no hay llaves VAPID configuradas en este entorno, se ignora en
// silencio, mismo criterio que lib/registrarAcceso.ts con la bitácora.

import webpush from "web-push";
import { db } from "./db";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:soporte@example.com";

let configurado = false;
function asegurarConfigurado(): boolean {
  if (configurado) return true;
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return false;
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  configurado = true;
  return true;
}

const TITULOS_ESTADO: Record<string, string> = {
  APROBADA: "Tu solicitud fue aprobada",
  RECHAZADA: "Tu solicitud fue rechazada",
  REVISADO: "Tu solicitud fue revisada",
  PAGADA: "Tu solicitud fue pagada",
  PENDIENTE: "Tu solicitud volvió a pendiente",
};
const TITULOS_ESTADO_PLURAL: Record<string, string> = {
  APROBADA: "solicitudes fueron aprobadas",
  RECHAZADA: "solicitudes fueron rechazadas",
  REVISADO: "solicitudes fueron revisadas",
  PAGADA: "solicitudes fueron pagadas",
  PENDIENTE: "solicitudes volvieron a pendiente",
};

async function enviarATodasLasSuscripciones(usuarioId: string, payload: string) {
  const suscripciones = await db.pushSubscription.findMany({ where: { usuarioId } });
  if (suscripciones.length === 0) return;

  await Promise.all(
    suscripciones.map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload);
      } catch (e) {
        // 404/410 = el push service dice que esa suscripción ya no
        // existe (el usuario desinstaló, revocó el permiso, etc.) — se
        // borra para no seguir intentando en vano.
        const status = (e as { statusCode?: number })?.statusCode;
        if (status === 404 || status === 410) {
          await db.pushSubscription.delete({ where: { id: s.id } }).catch(() => {});
        }
      }
    })
  );
}

// Nombre de quien hizo el cambio, para mostrarlo en el cuerpo del push
// ("Por Juan Pérez"). Se resuelve acá (a partir del id de quien está
// logueado, session.id de la ruta que llama) en vez de exigirle a cada
// endpoint que arme el texto — un solo lugar sabe cómo mostrarlo.
async function nombreDeUsuario(usuarioId: string | undefined): Promise<string | null> {
  if (!usuarioId) return null;
  const usuario = await db.usuario.findUnique({ where: { id: usuarioId }, select: { nombre: true } });
  return usuario?.nombre ?? null;
}

// Una solicitud puntual cambió de estado — usado por los endpoints
// individuales (aprobar, rechazar, revisar, pagar, revertir,
// devolver-revision).
export async function notificarCambioEstado(
  colaboradorId: string,
  opts: { codigo: string; estado: string; rutaLabel: string; actorId?: string }
) {
  if (!asegurarConfigurado()) return;
  try {
    const colaborador = await db.colaborador.findUnique({
      where: { id: colaboradorId },
      select: { usuarioId: true },
    });
    if (!colaborador) return;

    const nombreActor = await nombreDeUsuario(opts.actorId);
    const payload = JSON.stringify({
      title: TITULOS_ESTADO[opts.estado] ?? "Tu solicitud cambió de estado",
      body: nombreActor
        ? `${opts.codigo} · ${opts.rutaLabel} · Por ${nombreActor}`
        : `${opts.codigo} · ${opts.rutaLabel}`,
      url: "/mis-pasajes",
    });
    await enviarATodasLasSuscripciones(colaborador.usuarioId, payload);
  } catch {
    // No bloquea la acción real si esto falla por cualquier otro motivo.
  }
}

// Varias solicitudes cambiaron de estado a la vez (aprobar-lote,
// revisar-lote, pagar-lote) — agrupa por colaborador y manda UNA sola
// notificación por persona con el total, en vez de una por cada
// solicitud (nómina pagando todo el período junto podría ser decenas de
// una sola vez para el mismo colaborador).
export async function notificarCambioEstadoLote(
  items: { colaboradorId: string; estado: string }[],
  actorId?: string
) {
  if (items.length === 0 || !asegurarConfigurado()) return;
  try {
    const cantidadPorColaborador = new Map<string, number>();
    for (const it of items) {
      cantidadPorColaborador.set(it.colaboradorId, (cantidadPorColaborador.get(it.colaboradorId) ?? 0) + 1);
    }
    const estado = items[0].estado;
    const nombreActor = await nombreDeUsuario(actorId);

    await Promise.all(
      Array.from(cantidadPorColaborador.entries()).map(async ([colaboradorId, cantidad]) => {
        const colaborador = await db.colaborador.findUnique({
          where: { id: colaboradorId },
          select: { usuarioId: true },
        });
        if (!colaborador) return;

        const payload = JSON.stringify({
          title:
            cantidad === 1
              ? (TITULOS_ESTADO[estado] ?? "Tu solicitud cambió de estado")
              : `${cantidad} ${TITULOS_ESTADO_PLURAL[estado] ?? "solicitudes cambiaron de estado"}`,
          body: nombreActor ? `Por ${nombreActor} · Revisa el detalle en Mis Pasajes` : "Revisa el detalle en Mis Pasajes",
          url: "/mis-pasajes",
        });
        await enviarATodasLasSuscripciones(colaborador.usuarioId, payload);
      })
    );
  } catch {
    // No bloquea la acción real si esto falla por cualquier otro motivo.
  }
}
