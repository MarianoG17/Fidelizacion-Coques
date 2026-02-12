-- Script para verificar que las mesas se crearon correctamente
-- COPIAR Y EJECUTAR DESPUÉS del script de creación
SELECT id,
    nombre,
    "posX",
    "posY",
    ancho,
    alto,
    activa
FROM "Mesa"
WHERE "localId" = '65ceb6c8-cf0b-4e9b-8ed3-0bca399332df'
ORDER BY nombre;