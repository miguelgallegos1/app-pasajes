// app/api/admin/carga-masiva/colaboradores/route.ts
// POST: crea muchos colaboradores de una sola vez a partir de un .xlsx
// (mismas reglas que crear uno por uno en /api/colaboradores). TODO O
// NADA: primero se validan todas las filas sin escribir nada; si alguna
// tiene error no se guarda ninguna (se devuelve la lista de errores para
// corregir y volver a subir el mismo archivo), y si todas están bien se
// crean juntas en una sola transacción. Antes se guardaban las filas
// buenas y se saltaban las malas: al corregir y volver a subir, las ya
// creadas fallaban por código repetido y sus PIN no se volvían a ver.
// Solo Super Admin: crea cuentas de acceso reales (con PIN).

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

  // Códigos de nómina que trae el archivo, para chequear duplicados con
  // UNA sola consulta (en vez de un findFirst por fila dentro del loop).
  const codigosDelArchivo = Array.from(
    new Set(
      filas
        .map((f) => texto(f["Código de nómina"] ?? f["Codigo de nomina"]).toUpperCase())
        .filter(Boolean)
    )
  );

  const [mapaAreas, usuariosSinMigrar, colaboradoresExistentes] = await Promise.all([
    construirMapaAreas(),
    db.usuario.findMany({ where: { pinLookup: null }, select: { pinHash: true } }),
    codigosDelArchivo.length
      ? db.colaborador.findMany({ where: { codigoNomina: { in: codigosDelArchivo } }, select: { codigoNomina: true } })
      : Promise.resolve([]),
  ]);
  const pinLookupsUsados = new Set<string>();
  const codigosUsados = new Set(colaboradoresExistentes.map((c) => c.codigoNomina));

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

  type ErrorFila = { fila: number; estado: "ERROR"; mensaje: string };
  type FilaValida = {
    fila: number;
    apellidos: string;
    nombres: string;
    codigoNomina: string;
    esSupervisor: boolean;
    sitioId: string;
    areaId: string;
    pin: string | null; // null = se genera después de validar todo
  };
  const errores: ErrorFila[] = [];
  const validas: FilaValida[] = [];

  // --- 1) Validar TODAS las filas, sin escribir nada ---
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
      errores.push({ fila: numeroFila, estado: "ERROR", mensaje: "Apellidos, Nombres y Código de nómina son obligatorios" });
      continue;
    }

    const area = mapaAreas.get(clavearArea(empresaNombre, sitioNombre, areaNombre));
    if (!area) {
      errores.push({
        fila: numeroFila,
        estado: "ERROR",
        mensaje: `No existe el Área "${areaNombre}" en el Sitio "${sitioNombre}" de la Empresa "${empresaNombre}" (revisá la hoja "Áreas disponibles")`,
      });
      continue;
    }

    // codigosUsados = los que ya existen en la base + los de filas
    // anteriores de este mismo archivo (detecta repetidos dentro del Excel).
    if (codigosUsados.has(codigoNomina)) {
      errores.push({ fila: numeroFila, estado: "ERROR", mensaje: `El código de nómina "${codigoNomina}" ya está en uso` });
      continue;
    }
    codigosUsados.add(codigoNomina);

    if (pinPropuesto) {
      if (!/^\d{6}$/.test(pinPropuesto)) {
        errores.push({ fila: numeroFila, estado: "ERROR", mensaje: "El PIN debe tener exactamente 6 dígitos" });
        continue;
      }
      if (!(await pinDisponible(pinPropuesto))) {
        errores.push({ fila: numeroFila, estado: "ERROR", mensaje: `El PIN "${pinPropuesto}" ya está en uso` });
        continue;
      }
      pinLookupsUsados.add(calcularPinLookup(pinPropuesto));
    }

    validas.push({
      fila: numeroFila,
      apellidos,
      nombres,
      codigoNomina,
      esSupervisor,
      sitioId: area.sitioId,
      areaId: area.id,
      pin: pinPropuesto || null,
    });
  }

  if (errores.length > 0) {
    return NextResponse.json({ rechazado: true, creadas: 0, total: errores.length + validas.length, resultados: errores });
  }
  if (validas.length === 0) {
    return NextResponse.json({ error: "El archivo no tiene filas para procesar" }, { status: 400 });
  }

  // --- 2) Generar los PIN que faltan y preparar los datos (sin escribir) ---
  const preparadas: { fila: number; pin: string; pinHash: string; pinLookup: string; nombreCompleto: string; v: FilaValida }[] = [];
  for (const v of validas) {
    const pin = v.pin ?? (await generarPinUnico());
    if (!pin) {
      return NextResponse.json({
        rechazado: true,
        creadas: 0,
        total: validas.length,
        resultados: [{ fila: v.fila, estado: "ERROR", mensaje: "No se pudo generar un PIN único, intenta de nuevo" }],
      });
    }
    const pinLookup = calcularPinLookup(pin);
    pinLookupsUsados.add(pinLookup);
    preparadas.push({ fila: v.fila, pin, pinHash: await bcrypt.hash(pin, 10), pinLookup, nombreCompleto: `${v.apellidos} ${v.nombres}`, v });
  }

  // --- 3) Crear todo junto: si una sola falla, no queda ninguna creada ---
  try {
    await db.$transaction(
      preparadas.map((p) =>
        db.usuario.create({
          data: {
            nombre: p.nombreCompleto,
            pinHash: p.pinHash,
            pinLookup: p.pinLookup,
            rol: "COLABORADOR",
            colaborador: {
              create: {
                nombreCompleto: p.nombreCompleto,
                apellidos: p.v.apellidos,
                nombres: p.v.nombres,
                codigoNomina: p.v.codigoNomina,
                sitioId: p.v.sitioId,
                areaId: p.v.areaId,
                esSupervisor: p.v.esSupervisor,
              },
            },
          },
        })
      )
    );
  } catch (e) {
    const esConflicto = e instanceof Object && "code" in e && (e as { code?: string }).code === "P2002";
    return NextResponse.json(
      {
        error: esConflicto
          ? "Un código de nómina o PIN se usó mientras se procesaba el archivo. No se guardó nada: vuelve a subirlo."
          : "No se pudo crear los colaboradores. No se guardó nada: vuelve a intentarlo.",
      },
      { status: 409 }
    );
  }

  const resultados = preparadas.map((p) => ({
    fila: p.fila,
    estado: "OK" as const,
    mensaje: "Creado",
    pin: p.pin,
    nombreCompleto: p.nombreCompleto,
    codigoNomina: p.v.codigoNomina,
  }));
  return NextResponse.json({ creadas: resultados.length, total: resultados.length, resultados });
}
