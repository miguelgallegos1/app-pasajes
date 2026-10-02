// lib/useSeleccion.ts
// Selección múltiple de filas (casillas) para acciones en lote: marcar una,
// "Seleccionar todos" de la página visible y marcar un grupo entero (un
// colaborador en la vista "Por colaborador"). En grupo: si ya están todas
// marcadas las quita, si no las agrega todas. Antes cada panel repetía
// este mismo bloque.

"use client";

import { useState } from "react";

export function useSeleccion(paginaVisible: { id: string }[]) {
  const [seleccionadas, setSeleccionadas] = useState<Set<string>>(new Set());

  const todasEnPaginaSeleccionadas = paginaVisible.length > 0 && paginaVisible.every((f) => seleccionadas.has(f.id));

  const alternarSeleccion = (id: string) => {
    setSeleccionadas((prev) => {
      const copia = new Set(prev);
      if (copia.has(id)) copia.delete(id);
      else copia.add(id);
      return copia;
    });
  };

  const alternarGrupoSeleccion = (ids: string[]) => {
    setSeleccionadas((prev) => {
      const copia = new Set(prev);
      const todas = ids.every((id) => copia.has(id));
      ids.forEach((id) => (todas ? copia.delete(id) : copia.add(id)));
      return copia;
    });
  };

  const alternarSeleccionarTodo = () => alternarGrupoSeleccion(paginaVisible.map((f) => f.id));

  return { seleccionadas, setSeleccionadas, todasEnPaginaSeleccionadas, alternarSeleccion, alternarSeleccionarTodo, alternarGrupoSeleccion };
}
