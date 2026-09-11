-- AlterEnum: nuevo estado intermedio de revisión, entre Aprobada y Pagada
ALTER TYPE "EstadoSolicitud" ADD VALUE 'REVISADO' BEFORE 'RECHAZADA';

-- AlterEnum: Finanzas pasa a llamarse Nómina (RENAME VALUE preserva a los
-- usuarios que ya tengan este rol, sin necesidad de tocar datos a mano).
ALTER TYPE "Rol" RENAME VALUE 'FINANZAS' TO 'NOMINA';

-- AlterEnum: nuevo rol Coordinador
ALTER TYPE "Rol" ADD VALUE 'COORDINADOR' AFTER 'ADMIN_TH';

-- AlterTable
ALTER TABLE "SolicitudPasaje" ADD COLUMN     "fechaRevision" TIMESTAMP(3),
ADD COLUMN     "revisadoPorId" TEXT;
