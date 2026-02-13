-- ============================================================================
-- Script: Insertar Beneficios Iniciales para los 3 Niveles
-- Descripción: Crea beneficios reales aplicables al escanear QR del cliente
-- Fecha: 2026-02-13
-- ============================================================================
-- NOTA: Este script usa la estructura actual de la tabla Beneficio con los campos:
-- nombre, descripcionCaja, condiciones (JSON), activo
-- ============================================================================
-- PASO 1: Crear los Beneficios Base
-- ============================================================================
-- Beneficio 1: Agua de cortesía (para Bronce y Plata)
INSERT INTO "Beneficio" (
        "id",
        "nombre",
        "descripcionCaja",
        "condiciones",
        "requiereEstadoExterno",
        "activo",
        "createdAt",
        "updatedAt"
    )
VALUES (
        gen_random_uuid(),
        '🥤 Agua de cortesía',
        'Agua gratis - Beneficio nivel',
        '{"tipo": "PRODUCTO_GRATIS", "maxPorDia": 1, "icono": "🥤", "descripcion": "Vaso de agua de cortesía con el almuerzo"}'::jsonb,
        false,
        true,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ) ON CONFLICT DO NOTHING;
-- Beneficio 2: Descuento 10% cafetería (solo Bronce)
INSERT INTO "Beneficio" (
        "id",
        "nombre",
        "descripcionCaja",
        "condiciones",
        "requiereEstadoExterno",
        "activo",
        "createdAt",
        "updatedAt"
    )
VALUES (
        gen_random_uuid(),
        '🔥 10% descuento cafetería',
        'Desc. 10% cafetería post-almuerzo',
        '{"tipo": "DESCUENTO", "descuento": 0.10, "maxPorDia": 1, "icono": "🔥", "descripcion": "10% de descuento en cafetería después del almuerzo"}'::jsonb,
        false,
        true,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ) ON CONFLICT DO NOTHING;
-- Beneficio 3: Descuento 20% cafetería (solo Plata)
INSERT INTO "Beneficio" (
        "id",
        "nombre",
        "descripcionCaja",
        "condiciones",
        "requiereEstadoExterno",
        "activo",
        "createdAt",
        "updatedAt"
    )
VALUES (
        gen_random_uuid(),
        '🔥 20% descuento cafetería',
        'Desc. 20% cafetería post-almuerzo',
        '{"tipo": "DESCUENTO", "descuento": 0.20, "maxPorDia": 1, "icono": "🔥", "descripcion": "20% de descuento en cafetería después del almuerzo"}'::jsonb,
        false,
        true,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ) ON CONFLICT DO NOTHING;
-- Beneficio 4: Agua o Limonada de cortesía (solo Oro)
INSERT INTO "Beneficio" (
        "id",
        "nombre",
        "descripcionCaja",
        "condiciones",
        "requiereEstadoExterno",
        "activo",
        "createdAt",
        "updatedAt"
    )
VALUES (
        gen_random_uuid(),
        '🥤 Agua o limonada de cortesía',
        'Agua o limonada gratis - Nivel Oro',
        '{"tipo": "PRODUCTO_GRATIS", "maxPorDia": 1, "icono": "🥤", "descripcion": "Vaso de agua o limonada de cortesía con el almuerzo"}'::jsonb,
        false,
        true,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ) ON CONFLICT DO NOTHING;
-- Beneficio 5: Descuento 30% cafetería (solo Oro)
INSERT INTO "Beneficio" (
        "id",
        "nombre",
        "descripcionCaja",
        "condiciones",
        "requiereEstadoExterno",
        "activo",
        "createdAt",
        "updatedAt"
    )
VALUES (
        gen_random_uuid(),
        '🔥 30% descuento cafetería',
        'Desc. 30% cafetería post-almuerzo',
        '{"tipo": "DESCUENTO", "descuento": 0.30, "maxPorDia": 1, "icono": "🔥", "descripcion": "30% de descuento en cafetería después del almuerzo"}'::jsonb,
        false,
        true,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ) ON CONFLICT DO NOTHING;
-- Beneficio 6: Acceso Prioritario Eventos (solo Oro)
INSERT INTO "Beneficio" (
        "id",
        "nombre",
        "descripcionCaja",
        "condiciones",
        "requiereEstadoExterno",
        "activo",
        "createdAt",
        "updatedAt"
    )
VALUES (
        gen_random_uuid(),
        '🎖️ Acceso prioritario eventos',
        'Acceso VIP eventos especiales',
        '{"tipo": "ACCESO_VIP", "maxPorDia": 0, "icono": "🎖️", "descripcion": "Acceso prioritario a eventos especiales", "nota": "Este es un status permanente, no un uso"}'::jsonb,
        false,
        true,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ) ON CONFLICT DO NOTHING;
-- ============================================================================
-- PASO 2: Asignar Beneficios a Niveles
-- ============================================================================
-- NIVEL BRONCE: Agua + 10% descuento
INSERT INTO "NivelBeneficio" ("nivelId", "beneficioId")
SELECT n.id,
    b.id
FROM "Nivel" n
    CROSS JOIN "Beneficio" b
WHERE n.nombre = 'Bronce'
    AND b.nombre IN (
        '🥤 Agua de cortesía',
        '🔥 10% descuento cafetería'
    ) ON CONFLICT DO NOTHING;
-- NIVEL PLATA: Agua + 20% descuento
INSERT INTO "NivelBeneficio" ("nivelId", "beneficioId")
SELECT n.id,
    b.id
FROM "Nivel" n
    CROSS JOIN "Beneficio" b
WHERE n.nombre = 'Plata'
    AND b.nombre IN (
        '🥤 Agua de cortesía',
        '🔥 20% descuento cafetería'
    ) ON CONFLICT DO NOTHING;
-- NIVEL ORO: Agua o limonada + 30% descuento + Acceso prioritario
INSERT INTO "NivelBeneficio" ("nivelId", "beneficioId")
SELECT n.id,
    b.id
FROM "Nivel" n
    CROSS JOIN "Beneficio" b
WHERE n.nombre = 'Oro'
    AND b.nombre IN (
        '🥤 Agua o limonada de cortesía',
        '🔥 30% descuento cafetería',
        '🎖️ Acceso prioritario eventos'
    ) ON CONFLICT DO NOTHING;
-- ============================================================================
-- PASO 3: Verificación de Resultados
-- ============================================================================
-- Mostrar todos los beneficios creados
SELECT id,
    nombre,
    "descripcionCaja",
    condiciones,
    activo
FROM "Beneficio"
WHERE nombre LIKE '🥤%'
    OR nombre LIKE '🔥%'
    OR nombre LIKE '🎖️%'
ORDER BY nombre;
-- Mostrar asignación de beneficios por nivel
SELECT n.nombre as nivel,
    n.orden,
    b.nombre as beneficio,
    b."descripcionCaja",
    b.condiciones->>'tipo' as tipo,
    b.condiciones->>'descuento' as descuento,
    b.condiciones->>'maxPorDia' as "usosPorDia"
FROM "NivelBeneficio" nb
    INNER JOIN "Nivel" n ON nb."nivelId" = n.id
    INNER JOIN "Beneficio" b ON nb."beneficioId" = b.id
WHERE b.activo = true
ORDER BY n.orden,
    b.nombre;
-- Resumen por nivel
SELECT n.nombre as nivel,
    COUNT(nb."beneficioId") as "cantidadBeneficios"
FROM "Nivel" n
    LEFT JOIN "NivelBeneficio" nb ON n.id = nb."nivelId"
WHERE n.nombre IN ('Bronce', 'Plata', 'Oro')
GROUP BY n.nombre,
    n.orden
ORDER BY n.orden;
-- ============================================================================
-- NOTAS IMPORTANTES
-- ============================================================================
-- 
-- 1. Límites diarios: Los beneficios se renuevan a las 00:00 Argentina (UTC-3)
-- 2. Validación: Al escanear QR, verificar en EventoScan si ya se usó hoy
-- 3. Query verificación uso:
--    SELECT COUNT(*) FROM "EventoScan" 
--    WHERE "clienteId" = ? AND "beneficioId" = ? 
--    AND DATE("timestamp" AT TIME ZONE 'America/Argentina/Buenos_Aires') = CURRENT_DATE
-- 4. El campo condiciones (JSON) almacena metadata adicional como tipo, descuento, ícono
-- 5. descripcionCaja es el texto que debe aparecer en el sistema Aires IT
-- 
-- ============================================================================