-- Una ruta ya no puede ser exclusiva de un único colaborador: ahora puede
-- serlo de varios a la vez (ej. viven en el mismo sector y comparten ruta).
-- Se reemplaza la FK "Ruta.colaboradorExclusivoId" por la tabla de unión
-- implícita que Prisma espera para la relación m2m "RutaExclusiva".

-- CreateTable
CREATE TABLE "_RutaExclusiva" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_RutaExclusiva_AB_pkey" PRIMARY KEY ("A", "B")
);

-- CreateIndex
CREATE INDEX "_RutaExclusiva_B_index" ON "_RutaExclusiva"("B");

-- AddForeignKey
ALTER TABLE "_RutaExclusiva" ADD CONSTRAINT "_RutaExclusiva_A_fkey" FOREIGN KEY ("A") REFERENCES "Colaborador"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_RutaExclusiva" ADD CONSTRAINT "_RutaExclusiva_B_fkey" FOREIGN KEY ("B") REFERENCES "Ruta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migra las asignaciones existentes (1 colaborador por ruta) a la nueva tabla
-- antes de borrar la columna vieja, para no perder datos.
INSERT INTO "_RutaExclusiva" ("A", "B")
SELECT "colaboradorExclusivoId", "id" FROM "Ruta" WHERE "colaboradorExclusivoId" IS NOT NULL;

-- DropForeignKey
ALTER TABLE "Ruta" DROP CONSTRAINT "Ruta_colaboradorExclusivoId_fkey";

-- DropIndex
DROP INDEX "Ruta_colaboradorExclusivoId_idx";

-- AlterTable
ALTER TABLE "Ruta" DROP COLUMN "colaboradorExclusivoId";
