-- Script para investigar por qué Lucila no tiene visitas físicas contabilizadas
-- Solo tiene 2 visitas bonus (referido + cuestionario) pero 0 visitas físicas
-- PASO 1: Buscar el cliente Lucila
SELECT id,
    nombre,
    email,
    phone,
    "createdAt"
FROM "Cliente"
WHERE nombre ILIKE '%lucila%'
    OR nombre ILIKE '%lucía%'
ORDER BY "createdAt" DESC;
-- PASO 2: Ver TODOS los eventos de Lucila (reemplazá CLIENT_ID con el ID correcto)
-- SELECT 
--     id,
--     "tipoEvento",
--     "timestamp",
--     contabilizada,
--     "mesaId",
--     notas,
--     metodo,
--     "localId"
-- FROM "EventoScan"
-- WHERE "clienteId" = 'CLIENT_ID_AQUI'
-- ORDER BY "timestamp" DESC;
-- PASO 3: Ver solo las VISITAS de Lucila
-- SELECT 
--     id,
--     "tipoEvento",
--     "timestamp",
--     contabilizada,
--     "mesaId",
--     notas,
--     metodo
-- FROM "EventoScan"
-- WHERE "clienteId" = 'CLIENT_ID_AQUI'
--   AND "tipoEvento" = 'VISITA'
-- ORDER BY "timestamp" DESC;
-- PASO 4: Contar visitas por tipo
-- SELECT 
--     CASE 
--         WHEN notas ILIKE '%bonus%' OR notas ILIKE '%referir%' OR notas ILIKE '%cuestionario%' THEN 'Visita Bonus'
--         WHEN "mesaId" IS NULL THEN 'Visita Mostrador (sin mesa)'
--         ELSE 'Visita en Mesa'
--     END as "tipoVisita",
--     contabilizada,
--     COUNT(*) as total
-- FROM "EventoScan"
-- WHERE "clienteId" = 'CLIENT_ID_AQUI'
--   AND "tipoEvento" = 'VISITA'
-- GROUP BY 
--     CASE 
--         WHEN notas ILIKE '%bonus%' OR notas ILIKE '%referir%' OR notas ILIKE '%cuestionario%' THEN 'Visita Bonus'
--         WHEN "mesaId" IS NULL THEN 'Visita Mostrador (sin mesa)'
--         ELSE 'Visita en Mesa'
--     END,
--     contabilizada
-- ORDER BY contabilizada DESC, total DESC;
-- PASO 5: Ver si hay visitas físicas NO contabilizadas que deberían estarlo
-- SELECT 
--     id,
--     "timestamp",
--     contabilizada,
--     "mesaId",
--     notas,
--     metodo,
--     "localId"
-- FROM "EventoScan"
-- WHERE "clienteId" = 'CLIENT_ID_AQUI'
--   AND "tipoEvento" = 'VISITA'
--   AND contabilizada = false
--   AND (notas IS NULL OR notas NOT ILIKE '%bonus%')
-- ORDER BY "timestamp" DESC;
-- PASO 6: Si encontrás una visita física que debería estar contabilizada, corrígela:
-- UPDATE "EventoScan"
-- SET contabilizada = true
-- WHERE id = 'EVENTO_ID_AQUI';