-- Script para asignar nivel Bronce a todos los clientes que no tienen nivel
-- Esto corrige el problema donde clientes registrados no tenían nivel inicial asignado
-- Paso 1: Verificar cuántos clientes no tienen nivel
SELECT COUNT(*) as clientes_sin_nivel,
    COUNT(
        CASE
            WHEN estado = 'ACTIVO' THEN 1
        END
    ) as activos_sin_nivel
FROM "Cliente"
WHERE "nivelId" IS NULL;
-- Paso 2: Obtener el ID del nivel Bronce (orden = 1)
SELECT id as nivel_bronce_id,
    nombre
FROM "Nivel"
WHERE orden = 1
LIMIT 1;
-- Paso 3: Actualizar todos los clientes sin nivel para que tengan Bronce
-- IMPORTANTE: Reemplazar 'NIVEL_BRONCE_ID_AQUI' con el ID obtenido en el paso 2
UPDATE "Cliente"
SET "nivelId" = (
        SELECT id
        FROM "Nivel"
        WHERE orden = 1
        LIMIT 1
    )
WHERE "nivelId" IS NULL;
-- Paso 4: Verificar que se actualizaron correctamente
SELECT c.nombre,
    c.phone,
    c.email,
    n.nombre as nivel,
    c.estado,
    c."createdAt"
FROM "Cliente" c
    LEFT JOIN "Nivel" n ON c."nivelId" = n.id
WHERE c."createdAt" > NOW() - INTERVAL '7 days'
ORDER BY c."createdAt" DESC
LIMIT 20;