-- CreateTable: ConfiguracionApp
-- Fecha: 28 de Febrero 2026
-- Propósito: Sistema de configuración para feedback y push notifications
CREATE TABLE "ConfiguracionApp" (
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
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ConfiguracionApp_pkey" PRIMARY KEY ("id")
);
-- Insertar configuración por defecto
INSERT INTO "ConfiguracionApp" ("id", "updatedAt")
VALUES (
        'default-config-001',
        CURRENT_TIMESTAMP
    ) ON CONFLICT DO NOTHING;