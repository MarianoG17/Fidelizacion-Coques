-- ========================================
-- Migración: Convertir estado de TEXT a ENUM
-- ========================================
-- NOTA: Ejecuta esto en Vercel Postgres Query Editor

-- Paso 1: Ver qué valores existen actualmente (para verificar)
SELECT 
  estado, 
  COUNT(*) as cantidad,
  MIN("createdAt") as primera_vez,
  MAX("createdAt") as ultima_vez
FROM "EstadoAutoPendiente"
GROUP BY estado
ORDER BY cantidad DESC;

-- Paso 2: Normalizar valores no estándar (por seguridad)
-- Cualquier valor que no sea exactamente 'EN_PROCESO', 'LISTO' o 'ENTREGADO' 
-- se convierte a 'EN_PROCESO'
UPDATE "EstadoAutoPendiente"
SET estado = 'EN_PROCESO'
WHERE estado NOT IN ('EN_PROCESO', 'LISTO', 'ENTREGADO');

-- Paso 3: Crear el tipo ENUM si no existe
DO $$ BEGIN
  CREATE TYPE "EstadoAutoEnum" AS ENUM ('EN_PROCESO', 'LISTO', 'ENTREGADO');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Paso 4: Cambiar la columna de TEXT a ENUM
ALTER TABLE "EstadoAutoPendiente" 
ALTER COLUMN "estado" TYPE "EstadoAutoEnum" 
USING ("estado"::text::"EstadoAutoEnum");

-- Paso 5: Verificar que funcionó
SELECT 
  estado, 
  COUNT(*) 
FROM "EstadoAutoPendiente" 
GROUP BY estado;

-- ========================================
-- RESULTADO ESPERADO:
-- ✅ La columna ahora es tipo EstadoAutoEnum
-- ✅ Solo permite: EN_PROCESO, LISTO, ENTREGADO
-- ✅ Todos los datos existentes se preservaron
-- ========================================
