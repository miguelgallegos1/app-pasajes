-- El "dispositivo" (etiqueta amigable, ej. "iPhone") no tenía ninguna
-- restricción de unicidad: algunos navegadores no siempre respetan
-- excludeCredentials y dejaban crear una credencial nueva para un equipo
-- que ya tenía una activada, guardando el mismo equipo dos veces.

-- Si ya había duplicados guardados por esa falla, nos quedamos con el más
-- reciente (por creadoEn) de cada par usuario+dispositivo y borramos el
-- resto, para poder aplicar la restricción sin que falle por datos previos.
WITH duplicados AS (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY "usuarioId", "dispositivo"
    ORDER BY "creadoEn" DESC
  ) AS rn
  FROM "CredencialBiometrica"
  WHERE "dispositivo" IS NOT NULL
)
DELETE FROM "CredencialBiometrica"
WHERE id IN (SELECT id FROM duplicados WHERE rn > 1);

-- CreateIndex
CREATE UNIQUE INDEX "CredencialBiometrica_usuarioId_dispositivo_key" ON "CredencialBiometrica"("usuarioId", "dispositivo");
