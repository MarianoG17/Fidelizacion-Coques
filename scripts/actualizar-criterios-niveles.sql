-- Actualizar criterios de niveles para incluir referidos y perfil completo
-- Ejecutar en Neon SQL Editor

-- Ver estado actual
SELECT nombre, orden, criterios FROM "Nivel" ORDER BY orden;

-- IMPORTANTE: Ajustar los criterios según lo que realmente querés
-- Estos son ejemplos, modificalos antes de ejecutar

-- Opción 1: Plata requiere (4 visitas) O (2 referidos + perfil completo)
-- Oro requiere 6 visitas o más criterios

-- Bronce: sin requisitos especiales (nivel inicial)
UPDATE "Nivel" 
SET criterios = jsonb_set(
  jsonb_set(
    criterios::jsonb,
    '{referidosMinimos}',
    '0'
  ),
  '{perfilCompleto}',
  'false'
)
WHERE nombre = 'Bronce';

-- Plata: 4 visitas O (2 referidos + perfil completo)
UPDATE "Nivel"
SET criterios = jsonb_set(
  jsonb_set(
    jsonb_set(
      criterios::jsonb,
      '{visitas}',
      '4'
    ),
    '{referidosMinimos}',
    '2'
  ),
  '{perfilCompleto}',
  'true'
)
WHERE nombre = 'Plata';

-- Oro: 6 visitas (o podés agregar más criterios)
UPDATE "Nivel"
SET criterios = jsonb_set(
  jsonb_set(
    jsonb_set(
      criterios::jsonb,
      '{visitas}',
      '6'
    ),
    '{referidosMinimos}',
    '0'
  ),
  '{perfilCompleto}',
  'false'
)
WHERE nombre = 'Oro';

-- Ver resultado
SELECT 
  nombre,
  orden,
  criterios,
  (criterios::jsonb->>'visitas')::int as visitas_req,
  (criterios::jsonb->>'referidosMinimos')::int as referidos_req,
  (criterios::jsonb->>'perfilCompleto')::boolean as perfil_req
FROM "Nivel" 
ORDER BY orden;
