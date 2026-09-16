// app/api/admin/carga-masiva/colaboradores/route.ts
// POST: crea muchos colaboradores de una sola vez a partir de un .xlsx
// (mismas reglas que crear uno por uno en /api/colaboradores, fila por
// fila y en su propia transacción, para que una fila con error no tumbe
// a las demás). Solo Super Admin: crea cuentas de acceso reales (con PIN).

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { randomInt } from "crypto";
import { db } from "../../../../../lib/db";
import { getSession } from "../../../../../lib/auth";
import { calcularPinLookup } from "../../../../../lib/pin";
import { leerLibroExcel, texto, valorBooleanoSiNo, TOPE_FILAS_IMPORTACION } from "../../../../../lib/excelImport";
import { construirMapaAreas, clavearArea } from "../../../../../lib/areasLookup";

const INTENTOS_PIN = 20;

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.rol !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const formData = await req.formData();
  const archivo = formData.get("archivo");
  if (!(archivo instanceof File)) {
    return NextResponse.json({ error: "Falta el archivo .xlsx" }, { status: 400 });
  }

  const buffer = Buffer.from(await archivo.arrayBuffer());
  const filas = leerLibroExcel(buffer);
  if (filas.length === 0) {
    return NextResponse.json({ error: "El archivo no tiene filas para procesar" }, { status: 400 });
  }
  if (filas.length > TOPE_FILAS_IMPORTACION) {
    return NextResponse.json({ error: `Máximo ${TOPE_FILAS_IMPORTACION} filas por archivo` }, { status: 400 });
  }

  const mapaAreas = await construirMapaAreas();
  const usuariosSinMigrar = await db.usuario.findMany({ where: { pinLookup: null }, select: { pinHash: true } });
  const pinLookupsUsados = new Set<string>();
  const codigosUsados = new Set<string>();

  async function pinDisponible(pin: string): Promise<boolean> {
    const pinLookup = calcularPinLookup(pin);
    if (pinLookupsUsados.has(pinLookup)) return false;
    const enUso = await db.usuario.findFirst({ where: { pinLookup }, select: { id: true } });
    if (enUso) return false;
    for (const u of usuariosSinMigrar) {
      if (await bcrypt.compare(pin, u.pinHash)) return false;
    }
    return true;
  }

  async function generarPinUnico(): Promise<string | null> {
    for (let i = 0; i < INTENTOS_PIN; i++) {
      const pin = String(randomInt(0, 1_000_000)).padStart(6, "0");
      if (await pinDisponible(pin)) return pin;
    }
    return null;
  }

  const resultados: {
    fila: number;
    estado: "OK" | "ERROR";
    mensaje: string;
    pin?: string;
    nombreCompleto?: string;
    codigoNomina?: string;
  }[] = [];

  for (let i = 0; i < filas.length; i++) {
    const fila = filas[i];
    const numeroFila = i + 2; // +1 por índice base 0, +1 por la fila de cabecera
    const empresaNombre = texto(fila["Empresa"]);
    const sitioNombre = texto(fila["Sitio"]);
    const areaNombre = texto(fila["Área"] ?? fila["Area"]);
    const apellidos = texto(fila["Apellidos"]).toUpperCase();
    const nombres = texto(fila["Nombres"]).toUpperCase();
    const codigoNomina = texto(fila["Código de nómina"] ?? fila["Codigo de nomina"]).toUpperCase();
    const esSupervisor = valorBooleanoSiNo(fila["Es supervisor (SI/NO)"] ?? fila["Es supervisor"]);
    const pinPropuesto = texto(fila["PIN (opcional)"] ?? fila["PIN"]);

    if (!empresaNombre && !sitioNombre && !areaNombre && !apellidos && !nombres && !codigoNomina) {
      continue; // fila vacía (frecuente al final del rango de Excel)
    }

    if (!apellidos || !nombres || !codigoNomina) {
      resultados.push({ fila: numeroFila, estado: "ERROR", mensaje: "Apellidos, Nombres y Código de nómina son obligatorios" });
      continue;
    }

    const area = mapaAreas.get(clavearArea(empresaNombre, sitioNombre, areaNombre));
    if (!area) {
      resultados.push({
        fila: numeroFila,
        estado: "ERROR",
        mensaje: `No existe el Área "${areaNombre}" en el Sitio "${sitioNombre}" de la Empresa "${empresaNombre}" (revisá la hoja "Áreas disponibles")`,
      });
      continue;
    }

    if (codigosUsados.has(codigoNomina) || (await db.colaborador.findFirst({ where: { codigoNomina }, select: { id: true } }))) {
      resultados.push({ fila: numeroFila, estado: "ERROR", mensaje: `El código de nómina "${codigoNomina}" ya está en uso` });
      continue;
    }

    let pin = pinPropuesto;
    if (pin) {
      if (!/^\d{6}$/.test(pin)) {
        resultados.push({ fila: numeroFila, estado: "ERROR", mensaje: "El PIN debe tener exactamente 6 dígitos" });
        continue;
      }
      if (!(await pinDisponible(pin))) {
        resultados.push({ fila: numeroFila, estado: "ERROR", mensaje: `El PIN "${pin}" ya está en uso` });
        continue;
      }
    } else {
      const generado = await generarPinUnico();
      if (!generado) {
        resultados.push({ fila: numeroFila, estado: "ERROR", mensaje: "No se pudo generar un PIN único, intenta de nuevo" });
        continue;
      }
      pin = generado;
    }

    try {
      const pinHash = await bcrypt.hash(pin, 10);
      const pinLookup = calcularPinLookup(pin);
      const nombreCompleto = `${apellidos} ${nombres}`;

      await db.usuario.create({
        data: {
          nombre: nombreCompleto,
          pinHash,
          pinLookup,
          rol: "COLABORADOR",
          colaborador: {
            create: {
              nombreCompleto,
              apellidos,
              nombres,
              codigoNomina,
              sitioId: area.sitioId,
              areaId: area.id,
              esSupervisor,
            },
          },
        },
      });

      codigosUsados.add(codigoNomina);
      pinLookupsUsados.add(pinLookup);
      resultados.push({ fila: numeroFila, estado: "OK", mensaje: "Creado", pin, nombreCompleto, codigoNomina });
    } catch (e: any) {
      const mensaje = e?.code === "P2002" ? "El código de nómina o el PIN ya están en uso" : "No se pudo crear";
      resultados.push({ fila: numeroFila, estado: "ERROR", mensaje });
    }
  }

  const creadas = resultados.filter((r) => r.estado === "OK").length;
  return NextResponse.json({ creadas, total: resultados.length, resultados });
}
