-- AlterTable
ALTER TABLE "Colaborador" ADD COLUMN     "numero" SERIAL NOT NULL;

-- AlterTable
ALTER TABLE "Empresa" ADD COLUMN     "numero" SERIAL NOT NULL;

-- AlterTable
ALTER TABLE "Ruta" ADD COLUMN     "numero" SERIAL NOT NULL;

-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN     "numero" SERIAL NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Colaborador_numero_key" ON "Colaborador"("numero");

-- CreateIndex
CREATE UNIQUE INDEX "Empresa_numero_key" ON "Empresa"("numero");

-- CreateIndex
CREATE UNIQUE INDEX "Ruta_numero_key" ON "Ruta"("numero");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_numero_key" ON "Usuario"("numero");

