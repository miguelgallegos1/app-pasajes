// app/(app)/novedades/page.tsx
// Novedades de la app para todos los roles. Sin base de datos ni
// endpoints: la lista sale de lib/novedades.ts (un array en el código) y
// la sesión se lee de la cookie. Cada novedad se muestra un mes desde su
// publicación y después desaparece sola.

import { redirect } from "next/navigation";
import { getSession } from "../../../lib/auth";
import { novedadesVigentes, DIAS_VIGENCIA_NOVEDAD } from "../../../lib/novedades";
import { formatearFecha } from "../../../lib/fechas";
import { IconoNovedad } from "../../../components/Icons";
import EstadoVacio from "../../../components/EstadoVacio";
import MarcarNovedadesVistas from "../../../components/MarcarNovedadesVistas";

const MS_DIA = 24 * 60 * 60 * 1000;

function haceCuanto(fecha: string, ahora: number): string {
  const dias = Math.floor((ahora - new Date(`${fecha}T00:00:00-05:00`).getTime()) / MS_DIA);
  if (dias <= 0) return "Hoy";
  if (dias === 1) return "Ayer";
  if (dias < 7) return `Hace ${dias} días`;
  const semanas = Math.floor(dias / 7);
  return `Hace ${semanas} semana${semanas === 1 ? "" : "s"}`;
}

export default async function NovedadesPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  // eslint-disable-next-line react-hooks/purity -- componente de servidor: se calcula una vez por petición
  const ahora = Date.now();
  const novedades = novedadesVigentes(session.rol, ahora);

  return (
    <div className="flex-1 px-4 sm:px-8 pb-5">
      <MarcarNovedadesVistas usuarioId={session.id} ids={novedades.map((n) => n.id)} />

      <div className="max-w-2xl space-y-3">
        {novedades.length === 0 ? (
          <div className="bg-neutral-50 dark:bg-neutral-900 rounded-2xl ring-1 ring-black/5 dark:ring-white/10 px-4 py-10">
            <EstadoVacio mensaje="No hay novedades recientes" />
          </div>
        ) : (
          <ol className="relative space-y-3 before:absolute before:left-[19px] before:top-3 before:bottom-3 before:w-px before:bg-neutral-200 dark:before:bg-neutral-800">
            {novedades.map((n, i) => {
              const esNueva = ahora - new Date(`${n.fecha}T00:00:00-05:00`).getTime() < 7 * MS_DIA;
              return (
                <li
                  key={n.id}
                  className="relative flex gap-3 animate-[panel-in_0.35s_cubic-bezier(0.16,1,0.3,1)_both]"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <div
                    className={`relative z-10 shrink-0 w-10 h-10 rounded-xl flex items-center justify-center shadow-sm ${
                      esNueva
                        ? "bg-gradient-to-br from-orange-400 to-amber-500 text-white"
                        : "bg-white dark:bg-neutral-900 text-orange-500 ring-1 ring-black/5 dark:ring-white/10"
                    }`}
                  >
                    <IconoNovedad className="w-5 h-5" />
                  </div>

                  <article className="flex-1 min-w-0 bg-white dark:bg-neutral-900 rounded-2xl p-4 shadow-sm ring-1 ring-black/5 dark:ring-white/10 transition hover:shadow-md">
                    <div className="flex flex-wrap items-center gap-2">
                      {esNueva && (
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-orange-700 dark:text-orange-300 bg-orange-100 dark:bg-orange-500/15 px-2 py-0.5 rounded-full">
                          Nuevo
                        </span>
                      )}
                      <span className="text-[11px] text-neutral-400 dark:text-neutral-500" title={formatearFecha(`${n.fecha}T00:00:00Z`)}>
                        {haceCuanto(n.fecha, ahora)}
                      </span>
                    </div>
                    <h2 className="text-sm font-semibold text-neutral-900 dark:text-white mt-1.5">{n.titulo}</h2>
                    <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1 leading-relaxed">{n.descripcion}</p>
                  </article>
                </li>
              );
            })}
          </ol>
        )}

        <p className="text-[11px] text-neutral-400 dark:text-neutral-500 pl-1">
          Cada novedad se muestra durante {DIAS_VIGENCIA_NOVEDAD} días desde su publicación.
        </p>
      </div>
    </div>
  );
}
