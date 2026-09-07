-- AlterTable
ALTER TABLE "Colaborador" ADD COLUMN     "codigoNomina" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Colaborador_codigoNomina_key" ON "Colaborador"("codigoNomina");

