// app/api/admin/carga-masiva/rutas/route.ts
// POST: crea muchas rutas de una sola vez a partir de un .xlsx. TODO O
// NADA: primero se validan todas las filas sin escribir nada; si alguna
// tiene error no se guarda ninguna (se devuelve la lista de errores para
// corregir y volver a subir el mismo archivo), y si todas están bien se
// crean juntas en una sola transacción. Solo Super Admin.

import { NextResponse } from "next/server";
import { db } from "../../../../../lib/db";
import { getSession } from "../../../../../lib/auth";
import { leerLibroExcel, texto, TOPE_FILAS_IMPORTACION } from "../../../../../lib/excelImport";
import { construirMapaAreas, clavearArea } from "../../../../../lib/areasLookup";

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
  const errores: { fila: number; estado: "ERROR"; mensaje: string }[] = [];
  const validas: { fila: number; nombre: string; valor: number; area: { id: string; sitioId: string; empresaId: string } }[] = [];
  // "areaId|NOMBRE" de las rutas de este archivo, para detectar repetidas
  // dentro del mismo Excel antes de tocar la base.
  const clavesDelArchivo = new Set<string>();

  // --- 1) Validar TODAS las filas, sin escribir nada ---
  for (let i = 0; i < filas.length; i++) {
    const fila = filas[i];
    const numeroFila = i + 2;
    const empresaNombre = texto(fila["Empresa"]);
    const sitioNombre = texto(fila["Sitio"]);
    const areaNombre = texto(fila["Área"] ?? fila["Area"]);
    const desde = texto(fila["Desde"]);
    const hasta = texto(fila["Hasta"]);
    const valorTexto = texto(fila["Valor"]);

    if (!empresaNombre && !sitioNombre && !areaNombre && !desde && !hasta && !valorTexto) {
      continue; // fila vacía
    }

    if (!desde || !hasta) {
      errores.push({ fila: numeroFila, estado: "ERROR", mensaje: "Desde y Hasta son obligatorios" });
      continue;
    }
    // Mismo formato que el formulario de "Nueva ruta": "DESDE-HASTA", sin
    // espacios alrededor del guion.
    const nombre = `${desde}-${hasta}`.toUpperCase();

    const valor = Number(valorTexto.replace(",", "."));
    if (!valorTexto || isNaN(valor) || valor <= 0) {
      errores.push({ fila: numeroFila, estado: "ERROR", mensaje: "El valor debe ser un número mayor a 0" });
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

    const clave = `${area.id}|${nombre}`;
    if (clavesDelArchivo.has(clave)) {
      errores.push({ fila: numeroFila, estado: "ERROR", mensaje: `La ruta "${nombre}" está repetida en el archivo para esa área` });
      continue;
    }
    clavesDelArchivo.add(clave);
    validas.push({ fila: numeroFila, nombre, valor, area });
  }

  // Rutas que ya existen en la base con el mismo nombre en la misma área
  // (una sola consulta para todo el archivo).
  if (validas.length > 0) {
    const existentes = await db.ruta.findMany({
      where: { OR: validas.map((v) => ({ areaId: v.area.id, nombre: v.nombre })) },
      select: { areaId: true, nombre: true },
    });
    const clavesExistentes = new Set(existentes.map((r) => `${r.areaId}|${r.nombre}`));
    for (const v of validas) {
      if (clavesExistentes.has(`${v.area.id}|${v.nombre}`)) {
        errores.push({ fila: v.fila, estado: "ERROR", mensaje: "Ya existe una ruta con ese nombre en esa área" });
      }
    }
  }

  if (errores.length > 0) {
    errores.sort((a, b) => a.fila - b.fila);
    return NextResponse.json({ rechazado: true, creadas: 0, total: validas.length + errores.length, resultados: errores });
  }
  if (validas.length === 0) {
    return NextResponse.json({ error: "El archivo no tiene filas para procesar" }, { status: 400 });
  }

  // --- 2) Crear todo junto: si una sola falla, no queda ninguna creada ---
  try {
    await db.$transaction(
      validas.map((v) =>
        db.ruta.create({
          data: { nombre: v.nombre, empresaId: v.area.empresaId, sitioId: v.area.sitioId, areaId: v.area.id, valor: v.valor },
        })
      )
    );
  } catch (e) {
    const esConflicto = e instanceof Object && "code" in e && (e as { code?: string }).code === "P2002";
    return NextResponse.json(
      {
        error: esConflicto
          ? "Alguna ruta se creó mientras se procesaba el archivo. No se guardó nada: vuelve a subirlo."
          : "No se pudieron crear las rutas. No se guardó nada: vuelve a intentarlo.",
      },
      { status: 409 }
    );
  }

  const resultados = validas.map((v) => ({ fila: v.fila, estado: "OK" as const, mensaje: "Creada" }));
  return NextResponse.json({ creadas: resultados.length, total: resultados.length, resultados });
}
