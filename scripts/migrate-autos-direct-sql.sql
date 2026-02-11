-- ═══════════════════════════════════════════════════════════════════════════════
-- SCRIPT DE MIGRACIÓN: Autos en Proceso entre Bases de Datos Neon
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- PROPÓSITO: Migrar autos que NO están en estado ENTREGADO desde la BD antigua
--            a la nueva BD con el sistema de múltiples autos por cliente.
--
-- IMPORTANTE: Este script usa dblink para conectar dos bases Neon.
--             Solo funciona si ambas bases están en el mismo proyecto Neon
--             o si tienes permisos para usar dblink.
--
-- ALTERNATIVA: Si no puedes usar dblink, usa el script TypeScript:
--              scripts/migrate-autos-from-old-db.ts
--
-- ═══════════════════════════════════════════════════════════════════════════════
-- PASO 1: Habilitar extensión dblink (solo si no está habilitada)
-- Ejecutar en la base de datos NUEVA (destino)
CREATE EXTENSION IF NOT EXISTS dblink;
-- ═══════════════════════════════════════════════════════════════════════════════
-- CONFIGURACIÓN: Reemplaza estos valores con tus conexiones reales
-- ═══════════════════════════════════════════════════════════════════════════════
-- URL de conexión a la base ANTIGUA (origen)
-- Formato: 'host=xxx.neon.tech port=5432 dbname=xxx user=xxx password=xxx sslmode=require'
-- REEMPLAZA CON TU CONEXIÓN REAL:
\
set OLD_DB_CONN 'host=xxx.neon.tech port=5432 dbname=neondb_old user=neondb_owner password=tu_password sslmode=require' -- ═══════════════════════════════════════════════════════════════════════════════
    -- PASO 2: MIGRACIÓN DE AUTOS EN PROCESO
    -- ═══════════════════════════════════════════════════════════════════════════════
    -- Vista previa: Ver qué autos se van a migrar
SELECT phone,
    patente,
    estado,
    "localOrigenId"
FROM dblink(
        :'OLD_DB_CONN',
        'SELECT 
        c.phone,
        ea.patente,
        ea.estado,
        ea."localOrigenId"
     FROM "EstadoAuto" ea
     JOIN "Cliente" c ON c.id = ea."clienteId"
     WHERE ea.estado != ''ENTREGADO''
       AND ea.patente IS NOT NULL 
       AND ea.patente != ''''
     ORDER BY ea."createdAt" ASC'
    ) AS t(
        phone TEXT,
        patente TEXT,
        estado TEXT,
        "localOrigenId" TEXT
    );
-- ═══════════════════════════════════════════════════════════════════════════════
-- PASO 3: EJECUTAR LA MIGRACIÓN
-- ═══════════════════════════════════════════════════════════════════════════════
-- ADVERTENCIA: Revisa la vista previa antes de ejecutar esto.
-- Descomenta las líneas siguientes cuando estés listo:
/*
 DO $$
 DECLARE
 r RECORD;
 v_cliente_id TEXT;
 v_auto_id TEXT;
 v_patente_normalizada TEXT;
 v_contador INT := 0;
 BEGIN
 -- Iterar sobre cada auto en proceso desde la BD antigua
 FOR r IN 
 SELECT * FROM dblink(
 :'OLD_DB_CONN',
 'SELECT 
 c.phone as cliente_phone,
 ea.patente,
 ea.estado,
 ea."localOrigenId",
 ea.notas
 FROM "EstadoAuto" ea
 JOIN "Cliente" c ON c.id = ea."clienteId"
 WHERE ea.estado != ''ENTREGADO''
 AND ea.patente IS NOT NULL 
 AND ea.patente != ''''
 ORDER BY ea."createdAt" ASC'
 ) AS t(
 cliente_phone TEXT,
 patente TEXT,
 estado TEXT,
 localOrigenId TEXT,
 notas TEXT
 )
 LOOP
 -- Normalizar patente (eliminar espacios, mayúsculas)
 v_patente_normalizada := UPPER(REGEXP_REPLACE(r.patente, '[^A-Z0-9]', '', 'g'));
 
 -- Buscar o crear cliente
 SELECT id INTO v_cliente_id
 FROM "Cliente"
 WHERE phone = r.cliente_phone;
 
 IF v_cliente_id IS NULL THEN
 -- Crear cliente PRE_REGISTRADO si no existe
 INSERT INTO "Cliente" (id, phone, estado, "fuenteOrigen", "createdAt", "updatedAt")
 VALUES (gen_random_uuid(), r.cliente_phone, 'PRE_REGISTRADO', 'LAVADERO', NOW(), NOW())
 RETURNING id INTO v_cliente_id;
 
 RAISE NOTICE 'Cliente creado: % (ID: %)', r.cliente_phone, v_cliente_id;
 END IF;
 
 -- Verificar si el auto ya existe
 SELECT id INTO v_auto_id
 FROM "Auto"
 WHERE "clienteId" = v_cliente_id 
 AND patente = v_patente_normalizada;
 
 IF v_auto_id IS NULL THEN
 -- Crear auto nuevo
 INSERT INTO "Auto" (id, "clienteId", patente, activo, "createdAt", "updatedAt")
 VALUES (gen_random_uuid(), v_cliente_id, v_patente_normalizada, true, NOW(), NOW())
 RETURNING id INTO v_auto_id;
 
 RAISE NOTICE 'Auto creado: % (ID: %)', v_patente_normalizada, v_auto_id;
 END IF;
 
 -- Crear o actualizar estado del auto
 INSERT INTO "EstadoAuto" (id, "autoId", estado, "localOrigenId", notas, "createdAt", "updatedAt")
 VALUES (
 gen_random_uuid(),
 v_auto_id,
 r.estado::"EstadoAutoEnum",
 r.localOrigenId,
 r.notas,
 NOW(),
 NOW()
 )
 ON CONFLICT ("autoId") DO UPDATE SET
 estado = EXCLUDED.estado,
 "localOrigenId" = EXCLUDED."localOrigenId",
 notas = EXCLUDED.notas,
 "updatedAt" = NOW();
 
 v_contador := v_contador + 1;
 
 RAISE NOTICE 'Migrado: % - % (Estado: %)', r.cliente_phone, v_patente_normalizada, r.estado;
 END LOOP;
 
 RAISE NOTICE '═══════════════════════════════════════════';
 RAISE NOTICE 'MIGRACIÓN COMPLETADA: % autos migrados', v_contador;
 RAISE NOTICE '═══════════════════════════════════════════';
 END $$;
 */
-- ═══════════════════════════════════════════════════════════════════════════════
-- PASO 4: VERIFICACIÓN POST-MIGRACIÓN
-- ═══════════════════════════════════════════════════════════════════════════════
-- Ver autos migrados con sus estados
SELECT c.phone,
    a.patente,
    a.marca,
    a.modelo,
    ea.estado,
    ea."updatedAt"
FROM "Auto" a
    JOIN "Cliente" c ON c.id = a."clienteId"
    LEFT JOIN "EstadoAuto" ea ON ea."autoId" = a.id
WHERE ea.estado IS NOT NULL
ORDER BY ea."updatedAt" DESC;
-- Contar autos por estado
SELECT ea.estado,
    COUNT(*) as cantidad
FROM "EstadoAuto" ea
GROUP BY ea.estado
ORDER BY cantidad DESC;