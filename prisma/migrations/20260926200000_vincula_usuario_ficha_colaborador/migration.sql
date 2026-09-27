-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN     "colaboradorPropioId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_colaboradorPropioId_key" ON "Usuario"("colaboradorPropioId");

-- CreateIndex
CREATE INDEX "SolicitudPasaje_creadoPorUsuarioId_estado_idx" ON "SolicitudPasaje"("creadoPorUsuarioId", "estado");

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_colaboradorPropioId_fkey" FOREIGN KEY ("colaboradorPropioId") REFERENCES "Colaborador"("id") ON DELETE SET NULL ON UPDATE CASCADE;

