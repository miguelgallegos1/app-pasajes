-- CreateTable
CREATE TABLE "IntentoLogin" (
    "clave" TEXT NOT NULL,
    "conteo" INTEGER NOT NULL DEFAULT 1,
    "venceEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntentoLogin_pkey" PRIMARY KEY ("clave")
);
