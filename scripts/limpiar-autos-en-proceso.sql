-- ============================================
-- Script: Limpiar Autos en Proceso/Listo
-- ============================================
-- Propósito: Actualizar autos que quedaron en EN_PROCESO o LISTO 
-- por mucho tiempo (pruebas) y cambiarlos a ENTREGADO
--
-- Fecha: 28 de Febrero 2026
-- Uso: Ejecutar en Neon SQL Editor
-- ============================================

-- 1️⃣ CONSULTA: Ver autos actualmente en proceso o listos (para revisar antes de actualizar)
SELECT 
    ea.id,
    a.patente,
    a.marca,
    a.modelo,
    c.nombre as cliente,
    ea.estado,
    ea."updatedAt" as ultima_actualizacion,
    EXTRACT(EPOCH FROM (NOW() - ea."updatedAt")) / 3600 as horas_transcurridas
FROM "EstadoAuto" ea
JOIN "Auto" a ON ea."autoId" = a.id
LEFT JOIN "Cliente" c ON a."clienteId" = c.id
WHERE ea.estado IN ('EN_PROCESO', 'LISTO')
ORDER BY ea."updatedAt" ASC;

-- ============================================
-- 2️⃣ OPCIÓN A: Actualizar autos en proceso/listo por más de 6 horas
-- ============================================
-- Descomentar para ejecutar:

/*
UPDATE "EstadoAuto"
SET 
    estado = 'ENTREGADO',
    "updatedAt" = NOW()
WHERE 
    estado IN ('EN_PROCESO', 'LISTO')
    AND "updatedAt" < NOW() - INTERVAL '6 hours';
*/

-- ============================================
-- 2️⃣ OPCIÓN B: Actualizar autos en proceso/listo por más de 24 horas
-- ============================================
-- Descomentar para ejecutar:

/*
UPDATE "EstadoAuto"
SET 
    estado = 'ENTREGADO',
    "updatedAt" = NOW()
WHERE 
    estado IN ('EN_PROCESO', 'LISTO')
    AND "updatedAt" < NOW() - INTERVAL '24 hours';
*/

-- ============================================
-- 2️⃣ OPCIÓN C: Actualizar TODOS los autos en proceso/listo (CUIDADO)
-- ============================================
-- Usar solo si estás seguro de que TODOS deben ser ENTREGADO
-- Descomentar para ejecutar:

/*
UPDATE "EstadoAuto"
SET 
    estado = 'ENTREGADO',
    "updatedAt" = NOW()
WHERE 
    estado IN ('EN_PROCESO', 'LISTO');
*/

-- ============================================
-- 3️⃣ VERIFICACIÓN: Ver autos actualizados
-- ============================================
-- Ejecutar después del UPDATE para confirmar:

SELECT 
    ea.id,
    a.patente,
    ea.estado,
    ea."updatedAt" as actualizado_a
FROM "EstadoAuto" ea
JOIN "Auto" a ON ea."autoId" = a.id
WHERE ea.estado = 'ENTREGADO'
ORDER BY ea."updatedAt" DESC
LIMIT 20;

-- ============================================
-- 4️⃣ ESTADÍSTICAS: Resumen de estados actuales
-- ============================================

SELECT 
    estado,
    COUNT(*) as cantidad,
    MIN(ea."updatedAt") as mas_antiguo,
    MAX(ea."updatedAt") as mas_reciente
FROM "EstadoAuto" ea
GROUP BY estado
ORDER BY estado;

-- ============================================
-- 📝 NOTAS IMPORTANTES
-- ============================================
/*
1. Los beneficios del lavadero solo se otorgan cuando el auto está:
   - EN_PROCESO (lavándose)
   - LISTO (terminado pero no retirado)
   
2. Cuando cambia a ENTREGADO:
   - Se entiende que el cliente YA NO está en Coques
   - Los beneficios de "presencia en lavadero" dejan de aplicar
   - El auto queda en historial

3. Si cambiás un auto de prueba a ENTREGADO:
   - El cliente podrá volver a llevar el auto al lavadero
   - Se creará un nuevo registro de EstadoAuto cuando lo lleve
   - Todo funciona normalmente

4. Para simular un auto en el lavadero ahora:
   - Pedí al staff que escanee la patente desde /lavadero
   - O creá manualmente un EstadoAuto con estado EN_PROCESO
*/

-- ============================================
-- 🧪 TESTING: Crear auto de prueba en proceso
-- ============================================
-- Para crear un auto de prueba que esté "lavándose ahora"
-- (Reemplazá los valores según tu caso)

/*
-- Paso 1: Obtener el clienteId de tu cuenta de prueba
SELECT id, nombre, telefono FROM "Cliente" WHERE telefono = 'TU_TELEFONO';

-- Paso 2: Obtener o crear un Auto
-- Opción 2a: Si ya existe el auto, obtener su ID
SELECT id, patente, "clienteId" FROM "Auto" WHERE "clienteId" = 'ID_DEL_PASO_1';

-- Opción 2b: Si no existe, crear el auto
INSERT INTO "Auto" (id, patente, marca, modelo, "clienteId", activo)
VALUES (gen_random_uuid(), 'ABC123', 'Toyota', 'Corolla', 'ID_DEL_PASO_1', true)
RETURNING id;

-- Paso 3: Crear EstadoAuto EN_PROCESO
-- Primero eliminar el estado anterior si existe
DELETE FROM "EstadoAuto" WHERE "autoId" = 'ID_DEL_AUTO';

-- Luego crear el nuevo estado
INSERT INTO "EstadoAuto" (id, "autoId", estado, "localOrigenId", "createdAt", "updatedAt")
VALUES (
    gen_random_uuid(),
    'ID_DEL_AUTO',
    'EN_PROCESO',
    'ID_DEL_LOCAL_LAVADERO',  -- Obtener con: SELECT id FROM "Local" WHERE nombre LIKE '%Lavadero%'
    NOW(),
    NOW()
);
*/

-- ============================================
-- ✅ SCRIPT COMPLETO
-- ============================================
-- 1. Ejecutá la consulta 1️⃣ para VER qué autos hay
-- 2. Elegí OPCIÓN A, B o C según tu necesidad
-- 3. Descomentá el UPDATE que elegiste
-- 4. Ejecutalo
-- 5. Verificá con las consultas 3️⃣ y 4️⃣
