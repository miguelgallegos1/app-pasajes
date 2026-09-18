// app/api/admin/carga-masiva/rutas/route.ts
// POST: crea muchas rutas de una sola vez a partir de un .xlsx, fila por
// fila (una fila con error no tumba a las demás). Solo Super Admin.

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
  const resultados: { fila: number; estado: "OK" | "ERROR"; mensaje: string }[] = [];

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
      resultados.push({ fila: numeroFila, estado: "ERROR", mensaje: "Desde y Hasta son obligatorios" });
      continue;
    }
    // Mismo formato que el formulario de "Nueva ruta": "DESDE-HASTA", sin
    // espacios alrededor del guion.
    const nombre = `${desde}-${hasta}`.toUpperCase();

    const valor = Number(valorTexto.replace(",", "."));
    if (!valorTexto || isNaN(valor) || valor <= 0) {
      resultados.push({ fila: numeroFila, estado: "ERROR", mensaje: "El valor debe ser un número mayor a 0" });
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

    try {
      await db.ruta.create({
        data: { nombre, empresaId: area.empresaId, sitioId: area.sitioId, areaId: area.id, valor },
      });
      resultados.push({ fila: numeroFila, estado: "OK", mensaje: "Creada" });
    } catch (e: any) {
      const mensaje = e?.code === "P2002" ? "Ya existe una ruta con ese nombre en esa área" : "No se pudo crear";
      resultados.push({ fila: numeroFila, estado: "ERROR", mensaje });
    }
  }

  const creadas = resultados.filter((r) => r.estado === "OK").length;
  return NextResponse.json({ creadas, total: resultados.length, resultados });
}
