-- CreateIndex
CREATE INDEX "Area_sitioId_idx" ON "Area"("sitioId");

-- CreateIndex
CREATE INDEX "AsignacionTH_usuarioId_idx" ON "AsignacionTH"("usuarioId");

-- CreateIndex
CREATE INDEX "Colaborador_areaId_idx" ON "Colaborador"("areaId");

-- CreateIndex
CREATE INDEX "Colaborador_sitioId_idx" ON "Colaborador"("sitioId");

-- CreateIndex
CREATE INDEX "Colaborador_supervisorId_idx" ON "Colaborador"("supervisorId");

-- CreateIndex
CREATE INDEX "Colaborador_areaId_estado_idx" ON "Colaborador"("areaId", "estado");

-- CreateIndex
CREATE INDEX "Ruta_sitioId_areaId_activo_idx" ON "Ruta"("sitioId", "areaId", "activo");

-- CreateIndex
CREATE INDEX "SitioProductivo_empresaId_idx" ON "SitioProductivo"("empresaId");

-- CreateIndex
CREATE INDEX "SolicitudPasaje_rutaId_idx" ON "SolicitudPasaje"("rutaId");

-- CreateIndex
CREATE INDEX "SolicitudPasaje_estado_fecha_idx" ON "SolicitudPasaje"("estado", "fecha");

-- CreateIndex
CREATE INDEX "Usuario_rol_idx" ON "Usuario"("rol");
