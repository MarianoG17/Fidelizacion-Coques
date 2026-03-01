-- Agregar campo nivelesPeriodoDias a ConfiguracionApp
-- Permite configurar el período de días para evaluar visitas en niveles (antes hardcoded a 30)
-- Agregar el campo con valor por defecto 30
ALTER TABLE "ConfiguracionApp"
ADD COLUMN IF NOT EXISTS "nivelesPeriodoDias" INTEGER NOT NULL DEFAULT 30;
-- Verificar el cambio
SELECT id,
    "nivelesPeriodoDias",
    "feedbackHabilitado",
    "updatedAt"
FROM "ConfiguracionApp"
LIMIT 1;
-- Comentario informativo
COMMENT ON COLUMN "ConfiguracionApp"."nivelesPeriodoDias" IS 'Período de días para evaluar visitas en la gestión de niveles (ej: 30 días)';