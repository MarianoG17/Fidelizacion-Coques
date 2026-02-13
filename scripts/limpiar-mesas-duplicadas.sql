-- Script para borrar mesas duplicadas/incorrectas
-- Solo queremos mantener las mesas que empiezan con "S" o "G"
-- Ejecutar en Neon SQL Editor
-- Primero ver qué mesas se van a borrar (solo las que NO empiezan con S o G)
SELECT id,
    nombre,
    "posX",
    "posY"
FROM "Mesa"
WHERE "localId" = '65ceb6c8-cf0b-4e9b-8ed3-0bca399332df'
    AND nombre NOT LIKE 'S%'
    AND nombre NOT LIKE 'G%'
ORDER BY nombre;
-- Si estás seguro, borrá las mesas incorrectas:
-- DELETE FROM "Mesa"
-- WHERE "localId" = '65ceb6c8-cf0b-4e9b-8ed3-0bca399332df'
--   AND nombre NOT LIKE 'S%'
--   AND nombre NOT LIKE 'G%';
-- Después verificá que solo queden las correctas (debería haber 29):
-- SELECT id, nombre FROM "Mesa"
-- WHERE "localId" = '65ceb6c8-cf0b-4e9b-8ed3-0bca399332df'
-- ORDER BY nombre;