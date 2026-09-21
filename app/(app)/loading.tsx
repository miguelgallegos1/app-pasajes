// app/(app)/loading.tsx
// Next.js monta esto solo, vía Suspense, apenas cambian de sección (clic
// en el menú u otra navegación) mientras el SERVIDOR prepara la página
// nueva — y lo desmonta solo cuando esa página ya está lista. En vez de
// pintar su propia franja, avisa a la franja única de AppShell (ver
// lib/cargaGlobal.tsx) que hay una carga en curso; cuando el panel de la
// página nueva monta y empieza a pedir sus propios datos, esa misma
// franja sigue encendida sin interrupción — nunca hay dos instancias de
// DOM distintas de por medio, así que su animación nunca se reinicia.

"use client";

import { useReportarCarga } from "../../lib/cargaGlobal";

export default function Cargando() {
  useReportarCarga(true);
  return null;
}
