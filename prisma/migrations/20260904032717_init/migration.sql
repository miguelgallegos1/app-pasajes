-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('SUPER_ADMIN', 'ADMIN_TH', 'COLABORADOR', 'FINANZAS');

-- CreateEnum
CREATE TYPE "EstadoColaborador" AS ENUM ('ACTIVO', 'INACTIVO');

-- CreateEnum
CREATE TYPE "Frecuencia" AS ENUM ('DIARIA', 'SEMANAL', 'MENSUAL', 'ANUAL');

-- CreateEnum
CREATE TYPE "EstadoSolicitud" AS ENUM ('PENDIENTE', 'APROBADA', 'RECHAZADA', 'PAGADA');

-- CreateTable
CREATE TABLE "Empresa" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "ruc" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Empresa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SitioProductivo" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "direccion" TEXT,
    "empresaId" TEXT NOT NULL,

    CONSTRAINT "SitioProductivo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Area" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "sitioId" TEXT NOT NULL,

    CONSTRAINT "Area_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ruta" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "montoBase" DECIMAL(10,2) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Ruta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT,
    "pinHash" TEXT NOT NULL,
    "rol" "Rol" NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Colaborador" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "nombreCompleto" TEXT NOT NULL,
    "fotoUrl" TEXT,
    "rutaId" TEXT NOT NULL,
    "sitioId" TEXT NOT NULL,
    "areaId" TEXT NOT NULL,
    "estado" "EstadoColaborador" NOT NULL DEFAULT 'ACTIVO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Colaborador_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SolicitudPasaje" (
    "id" TEXT NOT NULL,
    "colaboradorId" TEXT NOT NULL,
    "frecuencia" "Frecuencia" NOT NULL,
    "cantidadPasajes" INTEGER NOT NULL,
    "montoTotal" DECIMAL(10,2) NOT NULL,
    "estado" "EstadoSolicitud" NOT NULL DEFAULT 'PENDIENTE',
    "fechaSolicitud" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaAprobacion" TIMESTAMP(3),
    "fechaPago" TIMESTAMP(3),
    "aprobadoPorId" TEXT,
    "pagadoPorId" TEXT,
    "comentario" TEXT,

    CONSTRAINT "SolicitudPasaje_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Empresa_ruc_key" ON "Empresa"("ruc");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Colaborador_usuarioId_key" ON "Colaborador"("usuarioId");

-- CreateIndex
CREATE INDEX "SolicitudPasaje_colaboradorId_estado_idx" ON "SolicitudPasaje"("colaboradorId", "estado");

-- CreateIndex
CREATE INDEX "SolicitudPasaje_fechaSolicitud_idx" ON "SolicitudPasaje"("fechaSolicitud");

-- AddForeignKey
ALTER TABLE "SitioProductivo" ADD CONSTRAINT "SitioProductivo_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Area" ADD CONSTRAINT "Area_sitioId_fkey" FOREIGN KEY ("sitioId") REFERENCES "SitioProductivo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Colaborador" ADD CONSTRAINT "Colaborador_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Colaborador" ADD CONSTRAINT "Colaborador_rutaId_fkey" FOREIGN KEY ("rutaId") REFERENCES "Ruta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Colaborador" ADD CONSTRAINT "Colaborador_sitioId_fkey" FOREIGN KEY ("sitioId") REFERENCES "SitioProductivo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Colaborador" ADD CONSTRAINT "Colaborador_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolicitudPasaje" ADD CONSTRAINT "SolicitudPasaje_colaboradorId_fkey" FOREIGN KEY ("colaboradorId") REFERENCES "Colaborador"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
