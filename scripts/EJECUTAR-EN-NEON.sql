-- ============================================================================
-- SCRIPT PARA EJECUTAR EN NEON DATABASE
-- Fix Race Condition: Agregar Unique Constraint a tabla Auto
-- ============================================================================

-- PASO 1: Verificar si hay duplicados (EJECUTAR PRIMERO)
SELECT 
    "clienteId", 
    patente, 
    COUNT(*) as cantidad
FROM "Auto"
GROUP BY "clienteId", patente
HAVING COUNT(*) > 1;

-- Si esta query devuelve filas, HAY DUPLICADOS.
-- Debes eliminarlos manualmente antes de continuar.
-- Si devuelve 0 filas, continuar con PASO 2.

-- ============================================================================

-- PASO 2: Crear el unique constraint
CREATE UNIQUE INDEX "Auto_clienteId_patente_key" 
ON "Auto"("clienteId", patente);

-- ============================================================================

-- PASO 3: Verificar que se creó correctamente
SELECT 
    indexname, 
    indexdef
FROM pg_indexes
WHERE tablename = 'Auto'
  AND indexname = 'Auto_clienteId_patente_key';

-- Debería mostrar:
-- indexname: Auto_clienteId_patente_key
-- indexdef: CREATE UNIQUE INDEX ...

-- ============================================================================
-- FIN DEL SCRIPT
-- ============================================================================

-- NOTAS:
-- - Este constraint previene que un cliente tenga la misma patente 2 veces
-- - Resuelve el race condition cuando 2 webhooks llegan simultáneamente
-- - Es SAFE: no borra datos, solo agrega validación
-- - Después de esto, el código usará upsert en lugar de findFirst + create
