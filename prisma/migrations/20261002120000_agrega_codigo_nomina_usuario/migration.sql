-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN     "codigoNomina" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_codigoNomina_key" ON "Usuario"("codigoNomina");

-- Usuarios que ya tienen su ficha relacionada: toman el código de esa
-- ficha (mayúsculas, sin espacios), así no hay que cargarlo a mano.
UPDATE "Usuario" AS u
SET "codigoNomina" = UPPER(REGEXP_REPLACE(c."codigoNomina", '\s', '', 'g'))
FROM "Colaborador" AS c
WHERE u."colaboradorPropioId" = c."id" AND c."codigoNomina" IS NOT NULL;
