// app/(app)/loading.tsx
// Se muestra al instante cuando cambian de sección (clic en el menú),
// mientras la página nueva trae sus datos — Next.js lo pone y lo saca
// solo, vía Suspense, sin JS de nuestro lado. Va "fixed" (no sticky) pegada
// al borde inferior del header: como el header tiene alto fijo (h-14/h-16
// en AppShell), este mismo top siempre coincide con su borde real, sin
// importar qué haya arriba en esa página en particular (por ejemplo, la
// miga de pan de sección, que ocupa su propio espacio en el flujo normal
// y correría esta franja unos píxeles si dependiera de eso).
// El left-0 md:left-60 es el ancho del sidebar (w-60 en AppShell): así la
// franja queda solo sobre el contenido de la pantalla actual, no encima
// de todo el ancho — no da a entender que se está recargando el
// header/sidebar, que ni se tocan.

export default function Cargando() {
  return (
    <div className="fixed top-14 md:top-16 left-0 md:left-60 right-0 z-20 h-[3px] overflow-hidden bg-orange-500/10">
      <span className="absolute top-0 h-full bg-orange-500 rounded-full animate-[barra-carga-1_2.1s_cubic-bezier(0.65,0.815,0.735,0.395)_infinite]" />
      <span className="absolute top-0 h-full bg-orange-500 rounded-full animate-[barra-carga-2_2.1s_cubic-bezier(0.165,0.84,0.44,1)_infinite] [animation-delay:1.15s]" />
    </div>
  );
}
