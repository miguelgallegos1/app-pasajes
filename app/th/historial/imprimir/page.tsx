// app/th/historial/imprimir/page.tsx
// Vista de solo impresión del historial de TH, SIEMPRE limitada a
// solicitudes PAGADAS sin importar el filtro de estado elegido en
// pantalla — pensada para imprimir y hacer firmar al colaborador como
// constancia de haber recibido el pago. Mismo rango de fechas (y
// colaborador, si se eligió uno) que la búsqueda. Sin librerías de PDF:
// se imprime con Ctrl+P o el botón, que dispara window.print(). Vive
// FUERA de app/(app) a propósito, para no heredar el sidebar/header
// (AppShell), que no debe aparecer en el papel.

import { redirect } from "next/navigation";
import { db } from "../../../../lib/db";
import { getSession } from "../../../../lib/auth";
import { obtenerCondicionRutaTH } from "../../../../lib/alcanceTH";
import { fechaValida, formatearFecha } from "../../../../lib/fechas";
import { formatearMoneda } from "../../../../lib/formato";
import BotonImprimir from "../../../../components/BotonImprimir";

// Mismo tope que las demás exportaciones: protege al servidor de un rango
// gigantesco sin cortar de forma silenciosa (se avisa en la propia página).
const TOPE_FILAS = 5000;

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
  const leer = (clave: string) => {
    const v = sp[clave];
    return typeof v === "string" ? v : "";
  };
  const desde = leer("desde");
  const hasta = leer("hasta");
  const colaboradorId = leer("colaboradorId");

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
    ...(sinRestriccion ? {} : { ruta: condicion }),
    ...(colaboradorId ? { colaboradorId } : {}),
  };

  const solicitudes = await db.solicitudPasaje.findMany({
    where: filtro,
    include: {
      colaborador: { select: { nombreCompleto: true } },
      ruta: { select: { nombre: true } },
    },
    orderBy: [{ colaborador: { nombreCompleto: "asc" } }, { fecha: "asc" }],
    take: TOPE_FILAS + 1,
  });
  const truncado = solicitudes.length > TOPE_FILAS;
  const filas = truncado ? solicitudes.slice(0, TOPE_FILAS) : solicitudes;
  const total = filas.reduce((acc, s) => acc + Number(s.montoTotal), 0);

  return (
    <div className="min-h-screen bg-white text-black px-6 py-8 print:p-0">
      <div className="flex items-start justify-between gap-4 mb-6 print:mb-4">
        <div>
          <h1 className="text-xl font-bold">Constancia de Pago</h1>
          <p className="text-sm text-neutral-600">
            {formatearFecha(desdeFecha)} — {formatearFecha(hastaFecha)}
          </p>
          <p className="text-xs text-neutral-400 print:text-neutral-500">
            Generado el {new Date().toLocaleString("es-EC")}
          </p>
        </div>
        <BotonImprimir className="print:hidden shrink-0" />
      </div>

      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b-2 border-black text-left">
            <th className="py-2 pr-3 font-semibold">Fecha</th>
            <th className="py-2 pr-3 font-semibold">Colaborador</th>
            <th className="py-2 pr-3 font-semibold">Ruta</th>
            <th className="py-2 pr-3 font-semibold text-right">Valor</th>
            <th className="py-2 pl-3 font-semibold w-40">Firma</th>
          </tr>
        </thead>
        <tbody>
          {filas.map((s) => (
            <tr key={s.id} className="border-b border-neutral-200">
              <td className="py-2 pr-3">{formatearFecha(s.fecha)}</td>
              <td className="py-2 pr-3">{s.colaborador.nombreCompleto}</td>
              <td className="py-2 pr-3">{s.ruta.nombre}</td>
              <td className="py-2 pr-3 text-right">{formatearMoneda(Number(s.montoTotal))}</td>
              <td className="py-2 pl-3 border-l border-neutral-200"></td>
            </tr>
          ))}
          {filas.length === 0 && (
            <tr>
              <td colSpan={5} className="py-8 text-center text-neutral-400">
                Sin pagos registrados en ese rango
              </td>
            </tr>
          )}
        </tbody>
        {filas.length > 0 && (
          <tfoot>
            <tr className="border-t-2 border-black font-bold">
              <td colSpan={3} className="py-2 pr-3 text-right">
                Total ({filas.length} {filas.length === 1 ? "pago" : "pagos"})
              </td>
              <td className="py-2 pr-3 text-right">{formatearMoneda(total)}</td>
              <td></td>
            </tr>
          </tfoot>
        )}
      </table>

      {truncado && (
        <p className="mt-4 text-xs text-amber-600 print:hidden">
          Se muestran las primeras {TOPE_FILAS} filas. Acorta el rango de fechas para ver el resto.
        </p>
      )}
    </div>
  );
}
