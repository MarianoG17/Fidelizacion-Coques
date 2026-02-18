-- Script para investigar visitas de un cliente específico
-- Ejecutar en Neon SQL Editor

-- Reemplazar '1131030130' con el teléfono del cliente que querés investigar

-- 1. Ver TODAS las visitas con detalles
SELECT 
  e.id,
  e."tipoEvento",
  e."metodoValidacion",
  e.contabilizada,
  e.notas,
  e.timestamp,
  l.nombre as local_nombre,
  b.nombre as beneficio_aplicado
FROM "EventoScan" e
LEFT JOIN "Local" l ON e."localId" = l.id
LEFT JOIN "Beneficio" b ON e."beneficioId" = b.id
WHERE e."clienteId" = (
  SELECT id FROM "Cliente" WHERE phone = '1131030130'
)
ORDER BY e.timestamp DESC;

-- 2. Resumen por tipo de evento
SELECT 
  e."tipoEvento",
  e."metodoValidacion",
  e.notas,
  COUNT(*) as cantidad
FROM "EventoScan" e
WHERE e."clienteId" = (
  SELECT id FROM "Cliente" WHERE phone = '1131030130'
)
AND e.contabilizada = true
GROUP BY e."tipoEvento", e."metodoValidacion", e.notas
ORDER BY cantidad DESC;

-- 3. Ver perfil completo del cliente
SELECT 
  c.nombre,
  c.phone,
  c.email,
  c.estado,
  c."fechaCumpleanos",
  c."fuenteConocimiento",
  c."codigoReferido",
  c."referidosActivados",
  c."createdAt",
  n.nombre as nivel
FROM "Cliente" c
LEFT JOIN "Nivel" n ON c."nivelId" = n.id
WHERE c.phone = '1131030130';

-- 4. Ver si refirió a alguien
SELECT 
  ref.nombre as referido_nombre,
  ref.phone as referido_phone,
  ref.estado as referido_estado,
  ref."createdAt" as fecha_registro
FROM "Cliente" c
LEFT JOIN "Cliente" ref ON ref."referidoPorId" = c.id
WHERE c.phone = '1131030130';
