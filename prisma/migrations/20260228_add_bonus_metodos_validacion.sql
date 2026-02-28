-- Migración: Agregar métodos de validación para visitas bonus
-- Fecha: 28 de Febrero 2026
-- Propósito: Diferenciar visitas bonus de visitas reales en estadísticas
-- Agregar nuevos valores al enum MetodoValidacion
ALTER TYPE "MetodoValidacion"
ADD VALUE IF NOT EXISTS 'BONUS_CUESTIONARIO';
ALTER TYPE "MetodoValidacion"
ADD VALUE IF NOT EXISTS 'BONUS_REFERIDO';
-- Actualizar registros existentes de visitas bonus
UPDATE "EventoScan"
SET "metodoValidacion" = 'BONUS_CUESTIONARIO'
WHERE "notas" = 'Visita bonus por completar cuestionario'
    AND "metodoValidacion" = 'OTP_MANUAL';
UPDATE "EventoScan"
SET "metodoValidacion" = 'BONUS_REFERIDO'
WHERE "notas" ILIKE 'Visita bonus por referir%'
    AND "metodoValidacion" = 'OTP_MANUAL';