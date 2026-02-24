-- Normalizar teléfonos existentes en la base de datos
-- Convierte teléfonos que empiezan con 15 → 11 (mismo número en Argentina)
-- Ejecutar ANTES de deployar el código nuevo
\ echo '🔧 Normalizando teléfonos existentes...' \ echo '' -- Paso 1: Ver cuántos clientes tienen teléfonos con 15
SELECT 'Clientes con 15' as categoria,
    COUNT(*) as cantidad
FROM "Cliente"
WHERE phone LIKE '15%'
    OR phone LIKE '+54915%';
\ echo '' \ echo 'Paso 2: Normalizando teléfonos que empiezan con 15...' -- Actualizar teléfonos que empiezan con 15 (sin código de país)
UPDATE "Cliente"
SET phone = '11' || SUBSTRING(
        phone
        FROM 3
    )
WHERE phone ~ '^15[0-9]{8}$';
-- Actualizar teléfonos con formato +54915
UPDATE "Cliente"
SET phone = REGEXP_REPLACE(phone, '^\+54915', '11')
WHERE phone ~ '^\+54915[0-9]{8}$';
-- Actualizar teléfonos con formato 54915
UPDATE "Cliente"
SET phone = REGEXP_REPLACE(phone, '^54915', '11')
WHERE phone ~ '^54915[0-9]{8}$';
\ echo 'Actualización completada' \ echo '' -- Paso 3: Verificar resultados
\ echo 'Verificando resultados...'
SELECT CASE
        WHEN phone ~ '^11[0-9]{8}$' THEN 'Formato correcto (11XXXXXXXX)'
        WHEN phone ~ '^15[0-9]{8}$' THEN 'Todavía con 15 (necesita revisión)'
        ELSE 'Otro formato'
    END as categoria,
    COUNT(*) as cantidad,
    ARRAY_AGG(
        phone
        ORDER BY phone
        LIMIT 3
    ) as ejemplos
FROM "Cliente"
GROUP BY categoria
ORDER BY categoria;
\ echo '' \ echo '✅ Normalización completada' \ echo '' \ echo '⚠️  IMPORTANTE: Si hay teléfonos "Todavía con 15", revisar manualmente'