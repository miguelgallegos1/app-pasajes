-- CreateTable
CREATE TABLE "Parametro" (
    "id" TEXT NOT NULL DEFAULT 'global',
    "diasAtrasSolicitud" INTEGER NOT NULL DEFAULT 2,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Parametro_pkey" PRIMARY KEY ("id")
);
