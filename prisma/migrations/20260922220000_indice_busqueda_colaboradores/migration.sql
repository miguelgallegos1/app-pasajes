-- Índices GIN con pg_trgm para la búsqueda de colaboradores (Ctrl+K,
-- ver app/api/colaboradores/buscar/route.ts), que usa "contains"/ILIKE
-- sobre nombreCompleto y codigoNomina. Un índice B-tree normal (como el
-- que ya existe por el @unique de codigoNomina) no sirve para "contains":
-- solo acelera igualdad/prefijo, no una subcadena en cualquier posición.
-- Sin este índice, cada letra tipeada en el buscador escanea toda la
-- tabla de colaboradores — se nota más cuanto más crece.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS "Colaborador_nombreCompleto_trgm_idx"
  ON "Colaborador" USING GIN ("nombreCompleto" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "Colaborador_codigoNomina_trgm_idx"
  ON "Colaborador" USING GIN ("codigoNomina" gin_trgm_ops);
