-- AlterTable
ALTER TABLE "SolicitudPasaje" ADD COLUMN     "codigo" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "SolicitudPasaje_codigo_key" ON "SolicitudPasaje"("codigo");

