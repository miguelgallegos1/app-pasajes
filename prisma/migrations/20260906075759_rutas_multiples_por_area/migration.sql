/*
  Warnings:

  - A unique constraint covering the columns `[areaId,nombre]` on the table `Ruta` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Ruta_empresaId_sitioId_areaId_key";

-- AlterTable
ALTER TABLE "Ruta" ADD COLUMN     "nombre" TEXT NOT NULL DEFAULT 'Ruta sin nombre';

-- CreateIndex
CREATE UNIQUE INDEX "Ruta_areaId_nombre_key" ON "Ruta"("areaId", "nombre");
