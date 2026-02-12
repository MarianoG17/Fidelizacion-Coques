-- Script para crear las mesas de Fidelización Coques en la base de datos
-- Ejecutar en Neon SQL Editor

-- Primero verificar que existe el local
SELECT id, nombre FROM "Local" WHERE nombre LIKE '%Coques%' OR nombre LIKE '%Fidelizacion%';

-- Si no existe, crear el local primero:
-- INSERT INTO "Local" (id, nombre, tipo, "apiKey", activo) 
-- VALUES (
--   gen_random_uuid(), 
--   'Fidelización Coques', 
--   'cafeteria', 
--   'tu-api-key-aqui', 
--   true
-- );

-- NOTA: Reemplazá 'LOCAL_ID_AQUI' con el UUID del local que te devuelva la query de arriba

-- Insertar todas las mesas
INSERT INTO "Mesa" (id, "localId", nombre, "posX", "posY", ancho, alto, activa) VALUES
-- Fila superior izquierda
(gen_random_uuid(), 'LOCAL_ID_AQUI', 'S1', 2, 2, 8, 8, true),
(gen_random_uuid(), 'LOCAL_ID_AQUI', 'S3', 12, 2, 8, 8, true),
(gen_random_uuid(), 'LOCAL_ID_AQUI', 'S5', 22, 2, 8, 8, true),
(gen_random_uuid(), 'LOCAL_ID_AQUI', 'S7', 32, 2, 8, 8, true),

-- Fila 2 izquierda
(gen_random_uuid(), 'LOCAL_ID_AQUI', 'S2', 2, 12, 8, 8, true),
(gen_random_uuid(), 'LOCAL_ID_AQUI', 'S4', 12, 12, 8, 8, true),
(gen_random_uuid(), 'LOCAL_ID_AQUI', 'S6', 22, 12, 8, 8, true),

-- Columna central
(gen_random_uuid(), 'LOCAL_ID_AQUI', 'S8', 45, 5, 8, 8, true),
(gen_random_uuid(), 'LOCAL_ID_AQUI', 'S9', 42, 15, 8, 8, true),
(gen_random_uuid(), 'LOCAL_ID_AQUI', 'S10', 42, 25, 8, 8, true),
(gen_random_uuid(), 'LOCAL_ID_AQUI', 'S11', 38, 35, 8, 8, true),
(gen_random_uuid(), 'LOCAL_ID_AQUI', 'S12', 38, 45, 8, 8, true),

-- Columna derecha
(gen_random_uuid(), 'LOCAL_ID_AQUI', 'G21', 70, 12, 8, 8, true),
(gen_random_uuid(), 'LOCAL_ID_AQUI', 'G22', 70, 24, 8, 8, true),
(gen_random_uuid(), 'LOCAL_ID_AQUI', 'G23', 82, 18, 8, 8, true),

-- Mesa individual centro
(gen_random_uuid(), 'LOCAL_ID_AQUI', 'S13', 48, 58, 8, 8, true),

-- Zona inferior - Grupo de mesas 4x2
(gen_random_uuid(), 'LOCAL_ID_AQUI', 'S25', 38, 75, 7, 7, true),
(gen_random_uuid(), 'LOCAL_ID_AQUI', 'S21', 46, 75, 7, 7, true),
(gen_random_uuid(), 'LOCAL_ID_AQUI', 'S24', 38, 83, 7, 7, true),
(gen_random_uuid(), 'LOCAL_ID_AQUI', 'S20', 46, 83, 7, 7, true),
(gen_random_uuid(), 'LOCAL_ID_AQUI', 'S23', 38, 91, 7, 7, true),
(gen_random_uuid(), 'LOCAL_ID_AQUI', 'S19', 46, 91, 7, 7, true),
(gen_random_uuid(), 'LOCAL_ID_AQUI', 'S22', 38, 99, 7, 7, true),
(gen_random_uuid(), 'LOCAL_ID_AQUI', 'S18', 46, 99, 7, 7, true),

-- Mesas laterales inferiores
(gen_random_uuid(), 'LOCAL_ID_AQUI', 'S17', 26, 82, 7, 7, true),
(gen_random_uuid(), 'LOCAL_ID_AQUI', 'S16', 26, 95, 7, 7, true),
(gen_random_uuid(), 'LOCAL_ID_AQUI', 'S14', 58, 72, 7, 7, true),
(gen_random_uuid(), 'LOCAL_ID_AQUI', 'S15', 65, 92, 7, 7, true);

-- Verificar que se crearon correctamente
SELECT id, nombre, "posX", "posY" FROM "Mesa" WHERE "localId" = 'LOCAL_ID_AQUI' ORDER BY nombre;
