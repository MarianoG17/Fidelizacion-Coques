-- Migración: Agregar estado PERDIDO y campo motivoPerdido a Presupuestos
-- Fecha: 2026-03-05
-- Descripción: Permite marcar presupuestos como perdidos con una razón

-- 1. Agregar nuevo valor al enum EstadoPresupuesto
ALTER TYPE "EstadoPresupuesto" ADD VALUE IF NOT EXISTS 'PERDIDO';

-- 2. Agregar campo motivoPerdido
ALTER TABLE "Presupuesto"
ADD COLUMN IF NOT EXISTS "motivoPerdido" TEXT;

-- 3. Verificar los cambios
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns
WHERE table_name = 'Presupuesto'
AND column_name = 'motivoPerdido';

-- 4. Ver valores del enum
SELECT 
    e.enumlabel AS estado
FROM pg_enum e
JOIN pg_type t ON e.enumtypid = t.oid
WHERE t.typname = 'EstadoPresupuesto'
ORDER BY e.enumsortorder;
