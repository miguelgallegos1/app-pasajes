// components/BarraCarga.tsx
// Franja naranja de progreso indeterminado para toda "espera continua" de
// la app: navegar a otra sección (mientras el servidor la prepara) y,
// apenas esa pantalla monta, traer sus propios datos del cliente. Antes
// cada fase pintaba su propia copia de este componente (loading.tsx por
// un lado, cada Panel con su cargandoInicial por el otro) — dos
// instancias de DOM distintas, así que al pasar de una a la otra el
// navegador reiniciaba la animación desde 0%, viéndose como un salto
// brusco a mitad de recorrido.
//
// Ahora hay UNA sola instancia, montada siempre en AppShell.tsx (nunca se
// desmonta durante la sesión) y controlada por lib/cargaGlobal.tsx: cada
// fase de carga solo avisa "estoy cargando" y esta franja decide mostrarse
// u ocultarse subiendo/bajando su opacidad. El navegador no pausa
// animaciones CSS por opacity (solo por display:none), así que la franja
// sigue su recorrido de fondo aunque esté invisible — al reaparecer no hay
// ningún reinicio que notar, solo un fundido.

export default function BarraCarga({ visible }: { visible: boolean }) {
  return (
    <div
      aria-hidden={!visible}
      className={`fixed top-14 md:top-16 left-0 md:left-60 right-0 z-20 h-[3px] overflow-hidden bg-orange-500/10 transition-opacity duration-300 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      <span className="absolute top-0 h-full bg-orange-500 rounded-full animate-[barra-carga-1_2.1s_cubic-bezier(0.65,0.815,0.735,0.395)_infinite]" />
      <span className="absolute top-0 h-full bg-orange-500 rounded-full animate-[barra-carga-2_2.1s_cubic-bezier(0.165,0.84,0.44,1)_infinite] [animation-delay:1.15s]" />
    </div>
  );
}
