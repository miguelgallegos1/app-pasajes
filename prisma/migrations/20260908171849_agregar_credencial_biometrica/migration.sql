-- CreateTable
CREATE TABLE "CredencialBiometrica" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "credentialId" TEXT NOT NULL,
    "publicKey" TEXT NOT NULL,
    "contador" INTEGER NOT NULL DEFAULT 0,
    "dispositivo" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ultimoUso" TIMESTAMP(3),

    CONSTRAINT "CredencialBiometrica_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CredencialBiometrica_credentialId_key" ON "CredencialBiometrica"("credentialId");

-- CreateIndex
CREATE INDEX "CredencialBiometrica_usuarioId_idx" ON "CredencialBiometrica"("usuarioId");

-- AddForeignKey
ALTER TABLE "CredencialBiometrica" ADD CONSTRAINT "CredencialBiometrica_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

