-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN     "pinLookup" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_pinLookup_key" ON "Usuario"("pinLookup");

