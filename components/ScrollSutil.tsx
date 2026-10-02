import type { ComponentPropsWithoutRef, ElementType } from "react";

/* Contenedor con scroll propio y barra sutil (fina, casi transparente, se
   marca al pasar el mouse) en vez de la barra gruesa por defecto del
   navegador. Los estilos viven en .scroll-sutil de app/globals.css, que
   también se aplican al scroll de la ventana. `as` permite usarlo como
   <nav>, <ul>, etc. sin un <div> extra. */
type Props<T extends ElementType> = {
  as?: T;
  className?: string;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "className">;

export default function ScrollSutil<T extends ElementType = "div">({ as, className = "", ...resto }: Props<T>) {
  const Componente: ElementType = as ?? "div";
  return <Componente className={`scroll-sutil overflow-y-auto overflow-x-hidden ${className}`} {...resto} />;
}
