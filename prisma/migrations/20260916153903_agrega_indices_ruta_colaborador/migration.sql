-- CreateIndex
CREATE INDEX "Colaborador_supervisorId_estado_idx" ON "Colaborador"("supervisorId", "estado");

-- CreateIndex
CREATE INDEX "Ruta_areaId_activo_idx" ON "Ruta"("areaId", "activo");

-- CreateIndex
CREATE INDEX "Ruta_empresaId_idx" ON "Ruta"("empresaId");
