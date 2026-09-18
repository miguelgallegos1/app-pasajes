-- Permite forzar el cierre de una sesión ajena (Super Admin): cualquier
-- token JWT emitido antes de este momento se considera inválido.
ALTER TABLE "Usuario" ADD COLUMN "sesionesRevocadasEn" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "RegistroAcceso" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "metodo" TEXT NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RegistroAcceso_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RegistroAcceso_usuarioId_creadoEn_idx" ON "RegistroAcceso"("usuarioId", "creadoEn");

-- CreateIndex
CREATE INDEX "RegistroAcceso_creadoEn_idx" ON "RegistroAcceso"("creadoEn");

-- AddForeignKey
ALTER TABLE "RegistroAcceso" ADD CONSTRAINT "RegistroAcceso_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
