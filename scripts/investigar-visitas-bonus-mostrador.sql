-- Script para investigar visitas bonus que aparecen en el historial de mostrador
-- Las visitas bonus NO deberían aparecer en el historial de clientes en mostrador

-- 1. Ver todas las visitas con mesaId null (mostrador y bonus)
SELECT 
  e.id,
  c.nombre as cliente_nombre,
  c.phone,
  e."tipoEvento",
  e."metodoValidacion",
  e.contabilizada,
  e.notas,
  e.timestamp,
  e."mesaId",
  l.nombre as local_nombre
FROM "EventoScan" e
JOIN "Cliente" c ON e."clienteId" = c.id
LEFT JOIN "Local" l ON e."localId" = l.id
WHERE e."tipoEvento" = 'VISITA'
  AND e."mesaId" IS NULL
  AND e.timestamp >= NOW() - INTERVAL '7 days'
ORDER BY e.timestamp DESC;

-- 2. Identificar visitas BONUS (que NO son físicas)
SELECT 
  e.id,
  c.nombre as cliente_nombre,
  c.phone,
  e."metodoValidacion",
  e.notas,
  e.timestamp
FROM "EventoScan" e
JOIN "Cliente" c ON e."clienteId" = c.id
WHERE e."tipoEvento" = 'VISITA'
  AND e."mesaId" IS NULL
  AND (
    e.notas ILIKE '%bonus%'
    OR e.notas ILIKE '%referir%'
    OR e.notas ILIKE '%cuestionario%'
    OR e.notas ILIKE '%retroactivamente%'
  )
ORDER BY e.timestamp DESC;

-- 3. Contar visitas reales vs bonus por cliente (últimos 30 días)
SELECT 
  c.nombre,
  c.phone,
  COUNT(*) FILTER (WHERE e.notas NOT ILIKE '%bonus%' 
                   AND e.notas NOT ILIKE '%referir%' 
                   AND e.notas NOT ILIKE '%cuestionario%') as visitas_reales,
  COUNT(*) FILTER (WHERE e.notas ILIKE '%bonus%' 
                   OR e.notas ILIKE '%referir%' 
                   OR e.notas ILIKE '%cuestionario%') as visitas_bonus,
  COUNT(*) as total_visitas
FROM "EventoScan" e
JOIN "Cliente" c ON e."clienteId" = c.id
WHERE e."tipoEvento" = 'VISITA'
  AND e.contabilizada = true
  AND e.timestamp >= NOW() - INTERVAL '30 days'
GROUP BY c.id, c.nombre, c.phone
HAVING COUNT(*) FILTER (WHERE e.notas ILIKE '%bonus%' 
                         OR e.notas ILIKE '%referir%' 
                         OR e.notas ILIKE '%cuestionario%') > 0
ORDER BY visitas_bonus DESC;

-- 4. Ver métodos de validación para visitas sin mesa
SELECT 
  e."metodoValidacion",
  COUNT(*) as cantidad,
  COUNT(*) FILTER (WHERE e.notas ILIKE '%bonus%' OR e.notas ILIKE '%referir%') as es_bonus
FROM "EventoScan" e
WHERE e."tipoEvento" = 'VISITA'
  AND e."mesaId" IS NULL
  AND e.timestamp >= NOW() - INTERVAL '7 days'
GROUP BY e."metodoValidacion"
ORDER BY cantidad DESC;
