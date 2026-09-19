// lib/codigoSolicitud.ts
// Código corto (4 caracteres) para identificar una solicitud de un
// vistazo, en vez de describirla por ruta/fecha/colaborador — por
// ejemplo, para pedir "elimina la 7K3M". Se arma con un alfabeto sin
// 0/O/1/I (se confunden fácil al leerlos o escribirlos a mano), lo que
// da 34^4 = 1.336.336 combinaciones posibles: de sobra para "miles de
// solicitudes" sin quedarse corto con el tiempo.

import { randomInt } from "crypto";
import { db } from "./db";

const ALFABETO = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const LARGO = 4;
const INTENTOS_MAXIMOS = 30;

function codigoAleatorio(): string {
  let codigo = "";
  for (let i = 0; i < LARGO; i++) {
    codigo += ALFABETO[randomInt(0, ALFABETO.length)];
  }
  return codigo;
}

export async function generarCodigoSolicitud(): Promise<string> {
  for (let intento = 0; intento < INTENTOS_MAXIMOS; intento++) {
    const codigo = codigoAleatorio();
    const existe = await db.solicitudPasaje.findUnique({ where: { codigo }, select: { id: true } });
    if (!existe) return codigo;
  }
  throw new Error("No se pudo generar un código único para la solicitud");
}

// Igual que generarCodigoSolicitud(), pero para crear/copiar VARIAS
// solicitudes de una vez: generar y verificar un código a la vez (una
// consulta por fila) es lo que hacía que crear 50-100 solicitudes en
// lote tardara decenas de segundos. Acá se generan todos los candidatos
// en memoria y se verifican contra la base en una sola consulta — las
// colisiones son rarísimas (34^4 combinaciones posibles) así que el caso
// normal es una sola vuelta.
export async function generarCodigosSolicitud(cantidad: number): Promise<string[]> {
  const codigos = new Set<string>();
  for (let ronda = 0; ronda < INTENTOS_MAXIMOS && codigos.size < cantidad; ronda++) {
    while (codigos.size < cantidad) codigos.add(codigoAleatorio());

    const existentes = await db.solicitudPasaje.findMany({
      where: { codigo: { in: Array.from(codigos) } },
      select: { codigo: true },
    });
    for (const { codigo } of existentes) codigos.delete(codigo);
  }
  if (codigos.size < cantidad) {
    throw new Error("No se pudo generar suficientes códigos únicos para el lote");
  }
  return Array.from(codigos).slice(0, cantidad);
}
