-- Script para eliminar el beneficio de "café gratis del lavadero" de los niveles
-- Beneficio identificado: "beneficio-cafe-lavadero"
-- Asociado a: Bronce, Plata, Oro
-- PASO 1: Eliminar relaciones del beneficio con los tres niveles
DELETE FROM "NivelBeneficio"
WHERE "beneficioId" = 'beneficio-cafe-lavadero';
-- PASO 2: Eliminar el beneficio completamente de la base de datos
DELETE FROM "Beneficio"
WHERE id = 'beneficio-cafe-lavadero';
-- VERIFICACIÓN: Comprobar que se eliminó correctamente
-- Debería retornar 0 filas
SELECT b.id,
    b.nombre,
    b."descripcionCaja",
    COUNT(nb."nivelId") as "nivelesAsociados"
FROM "Beneficio" b
    LEFT JOIN "NivelBeneficio" nb ON nb."beneficioId" = b.id
WHERE b.id = 'beneficio-cafe-lavadero'
GROUP BY b.id,
    b.nombre,
    b."descripcionCaja";
-- VERIFICACIÓN ALTERNATIVA: Ver todos los beneficios activos por nivel
SELECT n.nombre as "nivelNombre",
    b.nombre as "beneficioNombre",
    b."descripcionCaja"
FROM "Nivel" n
    LEFT JOIN "NivelBeneficio" nb ON nb."nivelId" = n.id
    LEFT JOIN "Beneficio" b ON b.id = nb."beneficioId"
WHERE b.activo = true
ORDER BY n.orden,
    b.nombre;