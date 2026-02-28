-- =============================================
-- Migración: Agregar tabla ConfiguracionApp
-- Ejecutar en: Neon Console SQL Editor
-- =============================================

-- 1. Crear tabla ConfiguracionApp
CREATE TABLE IF NOT EXISTS "ConfiguracionApp" (
    "id" TEXT NOT NULL,
    "feedbackHabilitado" BOOLEAN NOT NULL DEFAULT true,
    "feedbackTiempoVisitaMinutos" INTEGER NOT NULL DEFAULT 10,
    "feedbackDiasPedidoTorta" INTEGER NOT NULL DEFAULT 1,
    "feedbackFrecuenciaDias" INTEGER NOT NULL DEFAULT 7,
    "feedbackMinEstrellas" INTEGER NOT NULL DEFAULT 4,
    "googleMapsUrl" TEXT NOT NULL DEFAULT 'https://maps.app.goo.gl/n6q5HNELZuwDyT556',
    "pushHabilitado" BOOLEAN NOT NULL DEFAULT true,
    "pushAutoListo" BOOLEAN NOT NULL DEFAULT true,
    "pushNuevoNivel" BOOLEAN NOT NULL DEFAULT true,
    "pushBeneficioDisponible" BOOLEAN NOT NULL DEFAULT true,
    "pushBeneficioVence" BOOLEAN NOT NULL DEFAULT true,
    "pushCumpleanos" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConfiguracionApp_pkey" PRIMARY KEY ("id")
);

-- 2. Insertar configuración por defecto (solo si no existe)
INSERT INTO "ConfiguracionApp" (
    "id",
    "feedbackHabilitado",
    "feedbackTiempoVisitaMinutos",
    "feedbackDiasPedidoTorta",
    "feedbackFrecuenciaDias",
    "feedbackMinEstrellas",
    "googleMapsUrl",
    "pushHabilitado",
    "pushAutoListo",
    "pushNuevoNivel",
    "pushBeneficioDisponible",
    "pushBeneficioVence",
    "pushCumpleanos",
    "updatedAt",
    "createdAt"
)
SELECT 
    'default-config-001',
    true,
    10,
    1,
    7,
    4,
    'https://maps.app.goo.gl/n6q5HNELZuwDyT556',
    true,
    true,
    true,
    true,
    true,
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM "ConfiguracionApp" WHERE "id" = 'default-config-001'
);

-- 3. Verificar que se creó correctamente
SELECT * FROM "ConfiguracionApp";
