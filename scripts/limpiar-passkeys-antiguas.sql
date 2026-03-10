-- Script para limpiar passkeys con formato antiguo (base64)
-- Ejecutar en Vercel Postgres o tu base de datos

-- Ver todas las passkeys actuales (para confirmar antes de borrar)
SELECT 
    id,
    "clienteId",
    "dispositivoNombre",
    substring("credentialId", 1, 20) || '...' as credentialId_preview,
    "createdAt"
FROM "Passkey"
ORDER BY "createdAt" DESC;

-- Opción 1: Borrar TODAS las passkeys (más simple)
-- DELETE FROM "Passkey";

-- Opción 2: Borrar solo las de un cliente específico
-- Reemplaza 'TU_CLIENTE_ID' con tu ID real
-- DELETE FROM "Passkey" WHERE "clienteId" = 'TU_CLIENTE_ID';

-- Opción 3: Borrar solo las passkeys antiguas (formato base64 normal)
-- Las nuevas usan base64url que tiene - y _ en lugar de + y /
-- DELETE FROM "Passkey" WHERE "credentialId" LIKE '%+%' OR "credentialId" LIKE '%/%';

-- Después de borrar, verifica que se eliminaron:
-- SELECT COUNT(*) FROM "Passkey";

-- INSTRUCCIONES:
-- 1. Copia la query que necesites (elimina el -- al inicio)
-- 2. Ve a Vercel Dashboard → Storage → Tu base de datos → Query
-- 3. Pega y ejecuta la query
-- 4. Refresh la app y vuelve a registrar tu huella
