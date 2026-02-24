-- Script: Crear beneficio "20% descuento cafetería - Auto en lavadero"
-- Autor: Sistema de Fidelización Coques
-- Fecha: 2026-02-24
-- Descripción: Beneficio automático de 20% en cafetería cuando el cliente tiene auto en el lavadero
-- ============================================================================
-- 1. CREAR BENEFICIO
-- ============================================================================
INSERT INTO "Beneficio" (
        id,
        nombre,
        "descripcionCaja",
        condiciones,
        "requiereEstadoExterno",
        "estadoExternoTrigger",
        "localDestinoId",
        activo,
        "createdAt",
        "updatedAt"
    )
VALUES (
        'beneficio-20porciento-lavadero',
        '20% descuento — Auto en lavadero',
        'DESCUENTO 20% LAVADERO - Aplicar 20% desc. mientras espera su auto',
        jsonb_build_object(
            'porcentajeDescuento',
            20,
            'maxPorDia',
            1,
            'maxPorMes',
            10,
            'duracionMinutos',
            180,
            'mensaje',
            'Descuento del 20% mientras esperás tu auto'
        ),
        true,
        -- requiereEstadoExterno
        'EN_PROCESO',
        -- se activa cuando el auto está EN_PROCESO
        (
            SELECT id
            FROM "Local"
            WHERE tipo = 'cafeteria'
            LIMIT 1
        ), -- local destino: cafetería
        true,
        NOW(),
        NOW()
    ) ON CONFLICT (id) DO
UPDATE
SET nombre = EXCLUDED.nombre,
    "descripcionCaja" = EXCLUDED."descripcionCaja",
    condiciones = EXCLUDED.condiciones,
    "requiereEstadoExterno" = EXCLUDED."requiereEstadoExterno",
    "estadoExternoTrigger" = EXCLUDED."estadoExternoTrigger",
    "updatedAt" = NOW();
-- ============================================================================
-- 2. ASIGNAR BENEFICIO A TODOS LOS NIVELES
-- ============================================================================
-- Bronce
INSERT INTO "NivelBeneficio" ("nivelId", "beneficioId")
SELECT n.id,
    'beneficio-20porciento-lavadero'
FROM "Nivel" n
WHERE n.nombre = 'Bronce' ON CONFLICT ("nivelId", "beneficioId") DO NOTHING;
-- Plata
INSERT INTO "NivelBeneficio" ("nivelId", "beneficioId")
SELECT n.id,
    'beneficio-20porciento-lavadero'
FROM "Nivel" n
WHERE n.nombre = 'Plata' ON CONFLICT ("nivelId", "beneficioId") DO NOTHING;
-- Oro
INSERT INTO "NivelBeneficio" ("nivelId", "beneficioId")
SELECT n.id,
    'beneficio-20porciento-lavadero'
FROM "Nivel" n
WHERE n.nombre = 'Oro' ON CONFLICT ("nivelId", "beneficioId") DO NOTHING;
-- Platino
INSERT INTO "NivelBeneficio" ("nivelId", "beneficioId")
SELECT n.id,
    'beneficio-20porciento-lavadero'
FROM "Nivel" n
WHERE n.nombre = 'Platino' ON CONFLICT ("nivelId", "beneficioId") DO NOTHING;
-- ============================================================================
-- 3. VERIFICAR CREACIÓN
-- ============================================================================
SELECT b.id,
    b.nombre,
    b."descripcionCaja",
    b."requiereEstadoExterno",
    b."estadoExternoTrigger",
    b.condiciones,
    COUNT(nb."nivelId") as "niveles_asignados"
FROM "Beneficio" b
    LEFT JOIN "NivelBeneficio" nb ON nb."beneficioId" = b.id
WHERE b.id = 'beneficio-20porciento-lavadero'
GROUP BY b.id,
    b.nombre,
    b."descripcionCaja",
    b."requiereEstadoExterno",
    b."estadoExternoTrigger",
    b.condiciones;
-- ============================================================================
-- 4. CONSULTA: VER TODOS LOS BENEFICIOS DE LAVADERO
-- ============================================================================
SELECT b.id,
    b.nombre,
    b."descripcionCaja",
    b."estadoExternoTrigger",
    b.condiciones->>'porcentajeDescuento' as descuento,
    ARRAY_AGG(
        n.nombre
        ORDER BY n.orden
    ) as niveles
FROM "Beneficio" b
    LEFT JOIN "NivelBeneficio" nb ON nb."beneficioId" = b.id
    LEFT JOIN "Nivel" n ON n.id = nb."nivelId"
WHERE b."requiereEstadoExterno" = true
    AND b.activo = true
GROUP BY b.id,
    b.nombre,
    b."descripcionCaja",
    b."estadoExternoTrigger",
    b.condiciones
ORDER BY b."createdAt" DESC;
-- ============================================================================
-- 5. TESTING: Simular activación del beneficio
-- ============================================================================
-- Consultar si un cliente tiene auto en proceso
/*
 SELECT 
 c.id as cliente_id,
 c.nombre,
 c.phone,
 a.patente,
 ea.estado,
 ea."updatedAt"
 FROM "Cliente" c
 JOIN "Auto" a ON a."clienteId" = c.id
 JOIN "EstadoAuto" ea ON ea."autoId" = a.id
 WHERE c.phone = '+5491112345678'  -- Reemplazar con teléfono real
 AND ea.estado = 'EN_PROCESO';
 */
-- Ver beneficios activos de un cliente
/*
 SELECT 
 c.nombre,
 c.phone,
 n.nombre as nivel,
 b.nombre as beneficio,
 b."descripcionCaja"
 FROM "Cliente" c
 JOIN "Nivel" n ON n.id = c."nivelId"
 JOIN "NivelBeneficio" nb ON nb."nivelId" = n.id
 JOIN "Beneficio" b ON b.id = nb."beneficioId"
 WHERE c.phone = '+5491112345678'  -- Reemplazar con teléfono real
 AND b.activo = true
 ORDER BY b.nombre;
 */
-- ============================================================================
-- NOTAS IMPORTANTES
-- ============================================================================
-- 1. Este beneficio se activa AUTOMÁTICAMENTE cuando:
--    - El cliente registra su auto en el lavadero (estado EN_PROCESO)
--    - El beneficio está activo en la DB
--    - El cliente tiene un nivel asignado (Bronce, Plata, Oro o Platino)
-- 2. Duración: 180 minutos (3 horas) desde que se activa
-- 3. Limitaciones:
--    - Máximo 1 uso por día
--    - Máximo 10 usos por mes
-- 4. El descuento se aplica en caja con la instrucción:
--    "DESCUENTO 20% LAVADERO - Aplicar 20% desc. mientras espera su auto"
-- 5. Para desactivar este beneficio (si es necesario):
--    UPDATE "Beneficio" SET activo = false WHERE id = 'beneficio-20porciento-lavadero';
-- 6. Para cambiar el porcentaje de descuento:
--    UPDATE "Beneficio" 
--    SET condiciones = jsonb_set(condiciones, '{porcentajeDescuento}', '25')
--    WHERE id = 'beneficio-20porciento-lavadero';
-- ============================================================================
-- FIN DEL SCRIPT
-- ============================================================================