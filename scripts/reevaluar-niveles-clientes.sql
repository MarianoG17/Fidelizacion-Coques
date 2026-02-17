-- Script para re-evaluar y corregir niveles de clientes
-- Ejecutar en Neon SQL Editor

-- 1. Ver niveles actuales antes del cambio
SELECT
  n.nombre as nivel,
  COUNT(c.id) as cantidad_clientes
FROM "Cliente" c
LEFT JOIN "Nivel" n ON c."nivelId" = n.id
WHERE c.estado = 'ACTIVO'
GROUP BY n.nombre, n.orden
ORDER BY n.orden;

-- 2. Ver detalles de cada cliente con sus visitas
SELECT 
  c.nombre,
  c.phone,
  n.nombre as nivel_actual,
  COUNT(e.id) as visitas_totales
FROM "Cliente" c
LEFT JOIN "Nivel" n ON c."nivelId" = n.id
LEFT JOIN "EventoScan" e ON c.id = e."clienteId" AND e.contabilizada = true
WHERE c.estado = 'ACTIVO'
GROUP BY c.id, c.nombre, c.phone, n.nombre, n.orden
ORDER BY n.orden DESC, visitas_totales DESC;

-- 3. CORREGIR NIVELES: Asignar nivel correcto según visitas
-- Obtener IDs de niveles (ajustar según tu DB)
WITH niveles AS (
  SELECT id, nombre, orden, criterios
  FROM "Nivel"
  ORDER BY orden
),
clientes_con_visitas AS (
  SELECT 
    c.id as cliente_id,
    c."nivelId" as nivel_actual_id,
    COUNT(e.id) as total_visitas
  FROM "Cliente" c
  LEFT JOIN "EventoScan" e ON c.id = e."clienteId" AND e.contabilizada = true
  WHERE c.estado = 'ACTIVO'
  GROUP BY c.id, c."nivelId"
)
UPDATE "Cliente"
SET "nivelId" = (
  CASE 
    -- Si tiene 0-3 visitas → Bronce
    WHEN (SELECT total_visitas FROM clientes_con_visitas WHERE cliente_id = "Cliente".id) < 4 
      THEN (SELECT id FROM niveles WHERE nombre = 'Bronce' LIMIT 1)
    
    -- Si tiene 4+ visitas → Plata (o Oro si cumple más criterios, pero por ahora Plata)
    WHEN (SELECT total_visitas FROM clientes_con_visitas WHERE cliente_id = "Cliente".id) >= 4 
      THEN (SELECT id FROM niveles WHERE nombre = 'Plata' LIMIT 1)
    
    -- Fallback: mantener Bronce
    ELSE (SELECT id FROM niveles WHERE nombre = 'Bronce' LIMIT 1)
  END
)
WHERE estado = 'ACTIVO'
  AND id IN (SELECT cliente_id FROM clientes_con_visitas);

-- 4. Verificar cambios
SELECT
  n.nombre as nivel,
  n.orden,
  COUNT(c.id) as cantidad_clientes
FROM "Cliente" c
LEFT JOIN "Nivel" n ON c."nivelId" = n.id
WHERE c.estado = 'ACTIVO'
GROUP BY n.nombre, n.orden
ORDER BY n.orden;

-- 5. Ver detalles después del cambio
SELECT 
  c.nombre,
  c.phone,
  n.nombre as nivel_corregido,
  COUNT(e.id) as visitas_totales
FROM "Cliente" c
LEFT JOIN "Nivel" n ON c."nivelId" = n.id
LEFT JOIN "EventoScan" e ON c.id = e."clienteId" AND e.contabilizada = true
WHERE c.estado = 'ACTIVO'
GROUP BY c.id, c.nombre, c.phone, n.nombre, n.orden
ORDER BY n.orden, visitas_totales DESC;
