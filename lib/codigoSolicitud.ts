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
