// lib/whatsappTH.ts
// Resuelve qué número de WhatsApp de TH mostrarle a un colaborador: el de
// su Área si lo tiene, si no el de su Sitio, si no el de su Empresa. Se
// puede cargar en cualquiera de los 3 niveles (ver PanelEmpresas) — el más
// específico gana.

export function resolverWhatsappTH(cadena: {
  whatsapp: string | null;
  sitio: { whatsapp: string | null; empresa: { whatsapp: string | null } };
}): string | null {
  return cadena.whatsapp || cadena.sitio.whatsapp || cadena.sitio.empresa.whatsapp || null;
}

// Deja solo dígitos: wa.me exige el número en formato internacional sin
// espacios, guiones ni el "+" (ej. 593987654321). No asumimos un código de
// país fijo porque quien carga el número debe escribirlo completo.
export function limpiarNumeroWhatsapp(numero: string): string {
  return numero.replace(/[^0-9]/g, "");
}
