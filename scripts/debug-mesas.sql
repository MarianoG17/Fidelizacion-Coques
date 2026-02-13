-- Ver TODAS las mesas en la base de datos
SELECT id,
    "localId",
    nombre,
    "posX",
    "posY",
    activa
FROM "Mesa"
ORDER BY "localId",
    nombre;
-- Contar mesas por local
SELECT "localId",
    COUNT(*) as total_mesas
FROM "Mesa"
GROUP BY "localId";
-- Ver si hay duplicados
SELECT nombre,
    COUNT(*) as cantidad
FROM "Mesa"
WHERE "localId" = '65ceb6c8-cf0b-4e9b-8ed3-0bca399332df'
GROUP BY nombre
HAVING COUNT(*) > 1;