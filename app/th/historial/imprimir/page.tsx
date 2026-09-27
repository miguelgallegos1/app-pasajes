// app/th/historial/imprimir/page.tsx
// Constancia de pago de pasajes: vista de solo impresión del historial de
// TH, SIEMPRE limitada a solicitudes PAGADAS (sin importar el filtro de
// Estado) y con los mismos filtros de la búsqueda (fechas, Empresa/Sitio/
// Área, supervisor, colaborador). Resumida: una fila por colaborador con
// cantidad de pasajes, rutas y valor total, y espacio para que firme al
// recibir el pago. Sin librerías de PDF: se imprime con Ctrl+P o el botón.
// Vive FUERA de app/(app) a propósito, para no heredar el sidebar/header
// (AppShell), que no debe aparecer en el papel.

import { redirect } from "next/navigation";
import { db } from "../../../../lib/db";
import { getSession } from "../../../../lib/auth";
import { obtenerCondicionRutaTH } from "../../../../lib/alcanceTH";
import { ubicacionDesdeParams, condicionRuta } from "../../../../lib/filtroUbicacion";
import { fechaValida, formatearFecha } from "../../../../lib/fechas";
import { formatearMoneda } from "../../../../lib/formato";
import BotonImprimir from "../../../../components/BotonImprimir";
import { SIN_SUPERVISOR } from "../../../../lib/sinSupervisor";

// Mismo tope que las demás exportaciones: protege al servidor de un rango
// gigantesco sin cortar de forma silenciosa (se avisa en la propia página).
const TOPE_FILAS = 5000;

type Resumen = { id: string; area: string; nombre: string; pasajes: number; rutas: Set<string>; total: number };

export default async function ImprimirHistorialTHPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getSession();
  if (!session || !["ADMIN_TH", "SUPER_ADMIN"].includes(session.rol)) {
    redirect("/login");
  }

  const sp = await searchParams;
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) if (typeof v === "string") params.set(k, v);
  const desde = params.get("desde") ?? "";
  const hasta = params.get("hasta") ?? "";
  const colaboradorId = params.get("colaboradorId");
  const supervisorId = params.get("supervisorId");
  const empresaId = params.get("empresaId");
  const sitioId = params.get("sitioId");
  const areaId = params.get("areaId");

  const desdeFecha = fechaValida(desde);
  const hastaFecha = fechaValida(hasta);
  if (!desdeFecha || !hastaFecha) {
    redirect("/th/historial");
  }

  const { sinRestriccion, condicion } = await obtenerCondicionRutaTH(session.id, session.rol);
  if (condicion === null) {
    redirect("/th/historial");
  }

  const filtro = {
    estado: "PAGADA" as const,
    fecha: { gte: desdeFecha, lte: hastaFecha },
    ...condicionRuta(sinRestriccion, condicion, ubicacionDesdeParams(params)),
    ...(colaboradorId ? { colaboradorId } : {}),
    ...(supervisorId === SIN_SUPERVISOR
      ? { colaborador: { supervisorId: null } }
      : supervisorId
      ? { colaborador: { supervisorId } }
      : {}),
  };

  const [solicitudes, empresa, sitio, area] = await Promise.all([
    db.solicitudPasaje.findMany({
      where: filtro,
      select: {
        montoTotal: true,
        colaborador: { select: { id: true, nombreCompleto: true, area: { select: { nombre: true } } } },
        ruta: { select: { nombre: true } },
      },
      take: TOPE_FILAS + 1,
    }),
    empresaId ? db.empresa.findUnique({ where: { id: empresaId }, select: { nombre: true } }) : null,
    sitioId ? db.sitioProductivo.findUnique({ where: { id: sitioId }, select: { nombre: true } }) : null,
    areaId ? db.area.findUnique({ where: { id: areaId }, select: { nombre: true } }) : null,
  ]);
  const truncado = solicitudes.length > TOPE_FILAS;
  const filas = truncado ? solicitudes.slice(0, TOPE_FILAS) : solicitudes;

  // Resumen por colaborador: cantidad de pasajes, rutas distintas y total.
  const porColaborador = new Map<string, Resumen>();
  for (const s of filas) {
    const c = s.colaborador;
    const r = porColaborador.get(c.id) ?? { id: c.id, area: c.area.nombre, nombre: c.nombreCompleto, pasajes: 0, rutas: new Set<string>(), total: 0 };
    r.pasajes += 1;
    r.rutas.add(s.ruta.nombre);
    r.total += Number(s.montoTotal);
    porColaborador.set(c.id, r);
  }
  const resumen = Array.from(porColaborador.values()).sort(
    (a, b) => a.area.localeCompare(b.area) || a.nombre.localeCompare(b.nombre)
  );
  const totalPasajes = resumen.reduce((acc, r) => acc + r.pasajes, 0);
  const totalValor = Math.round(resumen.reduce((acc, r) => acc + r.total, 0) * 100) / 100;

  // Con "Área: Todas" se muestra la columna Área (hay gente de varias áreas
  // del sitio); con un área elegida, va una sola vez en el encabezado.
  const conColumnaArea = !areaId;
  const columnas = conColumnaArea ? 6 : 5;

  return (
    <div className="min-h-screen bg-white text-black px-6 py-8 print:p-0 text-xs">
      <div className="flex justify-end mb-3 print:hidden">
        <BotonImprimir />
      </div>

      <h1 className="text-center text-base font-bold uppercase tracking-wide">Constancia de pago de pasajes</h1>

      <div className="mt-4 mb-4 flex items-end justify-between gap-6">
        <dl className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5">
          <dt className="font-semibold">Empresa:</dt>
          <dd>{empresa?.nombre ?? "Todas"}</dd>
          <dt className="font-semibold">Sitio:</dt>
          <dd>{sitio?.nombre ?? "Todos"}</dd>
          {area && (
            <>
              <dt className="font-semibold">Área:</dt>
              <dd>{area.nombre}</dd>
            </>
          )}
          <dt className="font-semibold">Fechas:</dt>
          <dd>
            {formatearFecha(desdeFecha)} — {formatearFecha(hastaFecha)}
          </dd>
        </dl>
        <p className="text-neutral-500 text-right">Generado el {new Date().toLocaleString("es-EC", { timeZone: "America/Guayaquil" })}</p>
      </div>

      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b-2 border-black text-left">
            {conColumnaArea && <th className="py-2 pr-3 font-semibold">Área</th>}
            <th className="py-2 pr-3 font-semibold">Colaborador</th>
            <th className="py-2 pr-3 font-semibold text-center">N° pasajes</th>
            <th className="py-2 pr-3 font-semibold">Rutas</th>
            <th className="py-2 pr-3 font-semibold text-right">Valor total</th>
            <th className="py-2 pl-3 font-semibold w-56">Firma</th>
          </tr>
        </thead>
        <tbody>
          {resumen.map((r) => (
            // break-inside-avoid: una fila (con su espacio de firma) nunca
            // queda partida entre dos hojas.
            <tr key={r.id} className="border-b border-neutral-300 break-inside-avoid">
              {conColumnaArea && <td className="py-3 pr-3 align-top">{r.area}</td>}
              <td className="py-3 pr-3 align-top font-medium">{r.nombre}</td>
              <td className="py-3 pr-3 align-top text-center">{r.pasajes}</td>
              <td className="py-3 pr-3 align-top">{Array.from(r.rutas).sort().join(", ")}</td>
              <td className="py-3 pr-3 align-top text-right">{formatearMoneda(r.total)}</td>
              <td className="py-3 pl-3 border-l border-neutral-300 h-12"></td>
            </tr>
          ))}
          {resumen.length === 0 && (
            <tr>
              <td colSpan={columnas} className="py-8 text-center text-neutral-400">
                Sin pagos registrados con esos filtros
              </td>
            </tr>
          )}
          {/* El total va como última fila del cuerpo (no en <tfoot>): el
              navegador repite el <tfoot> en cada hoja impresa, y el total
              debe salir solo al final, en la última hoja. */}
          {resumen.length > 0 && (
            <tr className="border-t-2 border-black font-bold break-inside-avoid">
              <td colSpan={conColumnaArea ? 2 : 1} className="py-2 pr-3 text-right">
                Total ({resumen.length} {resumen.length === 1 ? "colaborador" : "colaboradores"})
              </td>
              <td className="py-2 pr-3 text-center">{totalPasajes}</td>
              <td></td>
              <td className="py-2 pr-3 text-right">{formatearMoneda(totalValor)}</td>
              <td></td>
            </tr>
          )}
        </tbody>
      </table>

      {truncado && (
        <p className="mt-4 text-amber-600 print:hidden">
          Se procesaron las primeras {TOPE_FILAS} solicitudes. Acorta el rango de fechas para ver el resto.
        </p>
      )}
    </div>
  );
}
