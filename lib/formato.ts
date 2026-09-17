// lib/formato.ts
// Formato de montos en dólares con separador de miles (Intl.NumberFormat),
// para que "$12345.67" se vea "$12,345.67" apenas los montos crecen — en
// vez de ".toFixed(2)" a mano repetido en cada pantalla.

const FORMATEADOR_MONEDA = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatearMoneda(valor: number): string {
  return `$${FORMATEADOR_MONEDA.format(valor)}`;
}
