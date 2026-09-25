-- AlterTable
ALTER TABLE "Parametro" ADD COLUMN     "seleccionTotalAprobar" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "seleccionTotalPagar" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "seleccionTotalRevisar" BOOLEAN NOT NULL DEFAULT false;
