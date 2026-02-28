-- Marcar TODOS los beneficios de descuento en tortas como "solo-app" (no canjeables en mostrador)
-- Estos beneficios se aplican automáticamente al comprar tortas por la app

-- Ver todos los beneficios de tortas actuales
SELECT
    id,
    nombre,
    activo,
    condiciones
FROM "Beneficio"
WHERE nombre ILIKE '%tortas%' OR nombre ILIKE '%descuento%tortas%'
ORDER BY nombre;

-- Agregar flag soloApp: true a TODOS los beneficios de descuento en tortas
UPDATE "Beneficio"
SET condiciones = jsonb_set(
    condiciones,
    '{soloApp}',
    'true'::jsonb,
    true
)
WHERE nombre ILIKE '%tortas%'
   OR nombre ILIKE '%descuento%tortas%'
   OR nombre ILIKE 'bonificacion tortas%';

-- También agregar una descripción que indique que es solo-app
UPDATE "Beneficio"
SET condiciones = jsonb_set(
    condiciones,
    '{descripcionScanner}',
    '"Descuento aplicado automáticamente al comprar por la app"'::jsonb,
    true
)
WHERE nombre ILIKE '%tortas%'
   OR nombre ILIKE '%descuento%tortas%'
   OR nombre ILIKE 'bonificacion tortas%';

-- Verificar cambios en todos los beneficios de tortas
SELECT
    nombre,
    activo,
    condiciones->'descuento' as porcentaje,
    condiciones->'soloApp' as solo_app,
    condiciones->'descripcionScanner' as descripcion_scanner,
    condiciones
FROM "Beneficio"
WHERE nombre ILIKE '%tortas%'
   OR nombre ILIKE '%descuento%tortas%'
   OR nombre ILIKE 'bonificacion tortas%'
ORDER BY nombre;

-- Ver todos los beneficios para comparar
SELECT
    nombre,
    activo,
    "requiereEstadoExterno",
    condiciones->'soloApp' as solo_app,
    condiciones
FROM "Beneficio"
ORDER BY nombre;