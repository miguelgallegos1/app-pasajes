-- DropForeignKey
ALTER TABLE "RegistroAcceso" DROP CONSTRAINT "RegistroAcceso_usuarioId_fkey";

-- AlterTable
ALTER TABLE "Usuario" DROP COLUMN "sesionesRevocadasEn";

-- DropTable
DROP TABLE "RegistroAcceso";

