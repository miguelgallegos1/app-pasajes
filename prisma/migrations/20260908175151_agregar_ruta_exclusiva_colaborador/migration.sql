-- AlterTable
ALTER TABLE "Ruta" ADD COLUMN     "colaboradorExclusivoId" TEXT;

-- CreateIndex
CREATE INDEX "Ruta_colaboradorExclusivoId_idx" ON "Ruta"("colaboradorExclusivoId");

-- AddForeignKey
ALTER TABLE "Ruta" ADD CONSTRAINT "Ruta_colaboradorExclusivoId_fkey" FOREIGN KEY ("colaboradorExclusivoId") REFERENCES "Colaborador"("id") ON DELETE SET NULL ON UPDATE CASCADE;

