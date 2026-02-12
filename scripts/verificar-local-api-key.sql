-- ============================================================================
-- Script: Verificar y Crear Local para API Key
-- ============================================================================
-- Este script te ayuda a:
-- 1. Verificar si existe un Local con la API Key configurada en Vercel
-- 2. Crear uno si no existe
-- 3. Verificar que esté activo
-- ============================================================================
-- PASO 1: Ver todos los locales existentes
-- ============================================================================
SELECT id,
    nombre,
    tipo,
    "apiKey",
    activo,
    "createdAt"
FROM "Local"
ORDER BY "createdAt" DESC;
-- ============================================================================
-- PASO 2: Verificar si existe el Local con tu API Key
-- ============================================================================
-- ⚠️ REEMPLAZA 'TU_API_KEY_DE_VERCEL' con el valor real de NEXT_PUBLIC_LOCAL_API_KEY
SELECT id,
    nombre,
    tipo,
    activo
FROM "Local"
WHERE "apiKey" = 'TU_API_KEY_DE_VERCEL';
-- Si esta query NO retorna nada, significa que NO existe y necesitas crearlo.
-- Si retorna un registro con activo=false, necesitas activarlo.
-- ============================================================================
-- PASO 3A: Crear Local (si NO existe)
-- ============================================================================
-- ⚠️ SOLO ejecutar si el PASO 2 no retornó resultados
-- Primero, genera una API Key nueva si no la tienes:
-- En terminal: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
-- O usa una que ya tengas
INSERT INTO "Local" (
        id,
        nombre,
        tipo,
        "apiKey",
        activo,
        "createdAt",
        "updatedAt"
    )
VALUES (
        gen_random_uuid(),
        'Coques Cafeteria',
        -- Nombre del local
        'cafeteria',
        -- Tipo: 'cafeteria' | 'lavadero' | 'otro'
        'TU_API_KEY_DE_VERCEL',
        -- ⚠️ REEMPLAZAR con tu API Key
        true,
        NOW(),
        NOW()
    );
-- ============================================================================
-- PASO 3B: Activar Local (si existe pero activo=false)
-- ============================================================================
-- ⚠️ SOLO ejecutar si el PASO 2 mostró un local con activo=false
UPDATE "Local"
SET activo = true,
    "updatedAt" = NOW()
WHERE "apiKey" = 'TU_API_KEY_DE_VERCEL';
-- ============================================================================
-- PASO 4: Verificar que quedó correcto
-- ============================================================================
SELECT id,
    nombre,
    tipo,
    "apiKey",
    activo
FROM "Local"
WHERE "apiKey" = 'TU_API_KEY_DE_VERCEL';
-- Debe retornar 1 registro con activo=true
-- ============================================================================
-- PASO 5: Ver las Mesas asociadas a este Local
-- ============================================================================
-- Las mesas deben estar vinculadas al localId
SELECT m.id,
    m.nombre,
    m."localId",
    l.nombre as "nombreLocal"
FROM "Mesa" m
    JOIN "Local" l ON l.id = m."localId"
WHERE l."apiKey" = 'TU_API_KEY_DE_VERCEL';
-- Si no hay mesas, necesitas crearlas:
-- Ver archivo: scripts/crear-mesas-local.sql
-- ============================================================================
-- TROUBLESHOOTING
-- ============================================================================
-- ❓ ¿Cómo obtengo el valor de NEXT_PUBLIC_LOCAL_API_KEY de Vercel?
-- 1. Ir a https://vercel.com/dashboard
-- 2. Seleccionar proyecto → Settings → Environment Variables
-- 3. Buscar NEXT_PUBLIC_LOCAL_API_KEY
-- 4. Copiar el valor (es visible porque es PUBLIC)
-- ❓ ¿Puedo cambiar la API Key?
-- Sí, pero debes:
-- 1. Actualizar en la tabla Local (esta query)
-- 2. Actualizar en Vercel Environment Variables
-- 3. Redeploy
-- ❓ ¿Puedo tener múltiples locales?
-- Sí, cada uno con su propia apiKey. Por ejemplo:
-- - Coques Cafeteria (apiKey1)
-- - Coques Lavadero (apiKey2)
-- En el frontend usarías diferentes variables de entorno
-- ============================================================================