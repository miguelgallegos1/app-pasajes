// components/AvatarRuta.tsx
// Mismo lenguaje visual que Avatar (círculo de color determinístico), pero
// para rutas: un ícono de trayecto en vez de iniciales, ya que "DESDE-HASTA"
// no da iniciales legibles. Si se pasa "valor", el color se elige por
// precio (rutas del mismo valor comparten color, agrupándolas de un
// vistazo); sin valor, cae al hash por nombre de siempre.

import { colorDeNombre, colorDeValor } from "./Avatar";
import { IconoRuta } from "./Icons";

export default function AvatarRuta({
  nombre,
  valor,
  className = "w-9 h-9",
}: {
  nombre: string;
  valor?: number;
  className?: string;
}) {
  const color = valor !== undefined ? colorDeValor(valor) : colorDeNombre(nombre);
  return (
    <div className={`rounded-full ${color} text-white flex items-center justify-center shrink-0 ${className}`}>
      <IconoRuta className="w-[55%] h-[55%]" />
    </div>
  );
}
