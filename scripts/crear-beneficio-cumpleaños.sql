-- Script: Crear beneficio "Descuento semana de cumpleaños"
-- Autor: Sistema de Fidelización Coques
-- Fecha: 2026-03-04
-- Descripción: Beneficio automático durante la semana del cumpleaños del cliente
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
        'beneficio-cumpleanos',
        '🎂 Semana de Cumpleaños',
        'CUMPLEAÑOS - Descuento especial por cumpleaños',
        jsonb_build_object(
            'porcentajeDescuento',
            15,
            -- 15% de descuento
            'maxPorDia',
            1,
            -- Máximo 1 uso por día
            'maxPorMes',
            1,
            -- Máximo 1 uso en el mes (solo durante la semana)
            'duracionMinutos',
            NULL,
            -- Sin duración, válido toda la semana
            'mensaje',
            '¡Feliz cumpleaños! Disfrutá tu descuento especial',
            'requiereFechaCumpleanos',
            true,
            -- Requiere que el cliente tenga fecha de cumpleaños cargada
            'diasAntes',
            3,
            -- Activar 3 días antes del cumpleaños
            'diasDespues',
            3 -- Desactivar 3 días después del cumpleaños
        ),
        false,
        -- NO requiere estado externo
        NULL,
        -- Sin estado externo
        (
            SELECT id
            FROM "Local"
            WHERE tipo = 'cafeteria'
            LIMIT 1
        ), -- Local destino: cafetería (puede usarse en cualquiera)
        true,
        -- Activo
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
    'beneficio-cumpleanos'
FROM "Nivel" n
WHERE n.nombre = 'Bronce' ON CONFLICT ("nivelId", "beneficioId") DO NOTHING;
-- Plata
INSERT INTO "NivelBeneficio" ("nivelId", "beneficioId")
SELECT n.id,
    'beneficio-cumpleanos'
FROM "Nivel" n
WHERE n.nombre = 'Plata' ON CONFLICT ("nivelId", "beneficioId") DO NOTHING;
-- Oro
INSERT INTO "NivelBeneficio" ("nivelId", "beneficioId")
SELECT n.id,
    'beneficio-cumpleanos'
FROM "Nivel" n
WHERE n.nombre = 'Oro' ON CONFLICT ("nivelId", "beneficioId") DO NOTHING;
-- ============================================================================
-- 3. VERIFICAR CREACIÓN
-- ============================================================================
SELECT b.id,
    b.nombre,
    b."descripcionCaja",
    b."requiereEstadoExterno",
    b.condiciones,
    COUNT(nb."nivelId") as "niveles_asignados"
FROM "Beneficio" b
    LEFT JOIN "NivelBeneficio" nb ON nb."beneficioId" = b.id
WHERE b.id = 'beneficio-cumpleanos'
GROUP BY b.id,
    b.nombre,
    b."descripcionCaja",
    b."requiereEstadoExterno",
    b.condiciones;
-- ============================================================================
-- 4. CONSULTA: VER CLIENTES CON CUMPLEAÑOS PRÓXIMOS
-- ============================================================================
-- Ver clientes que cumplen años en los próximos 7 días
SELECT c.nombre,
    c.phone,
    c."fechaCumpleanos",
    EXTRACT(
        DAY
        FROM c."fechaCumpleanos"
    ) as dia_cumple,
    EXTRACT(
        MONTH
        FROM c."fechaCumpleanos"
    ) as mes_cumple,
    n.nombre as nivel
FROM "Cliente" c
    LEFT JOIN "Nivel" n ON n.id = c."nivelId"
WHERE c."fechaCumpleanos" IS NOT NULL
    AND c.estado = 'ACTIVO'
ORDER BY EXTRACT(
        MONTH
        FROM c."fechaCumpleanos"
    ),
    EXTRACT(
        DAY
        FROM c."fechaCumpleanos"
    );
-- ============================================================================
-- NOTAS IMPORTANTES
-- ============================================================================
-- 1. Este beneficio se debe activar AUTOMÁTICAMENTE cuando:
--    - El cliente tiene fechaCumpleanos cargada
--    - Está dentro de la ventana: 3 días antes hasta 3 días después de su cumpleaños
--    - El beneficio está activo en la DB
--    - El cliente tiene un nivel asignado (Bronce, Plata, Oro)
--
-- 2. Implementación en código:
--    - Agregar lógica en src/lib/beneficios.ts para verificar si estamos
--      en la semana del cumpleaños del cliente
--    - Calcular si la fecha actual está entre (cumpleaños - 3 días) y (cumpleaños + 3 días)
--    - Considerar el caso de cumpleaños que cruzan año (ej: 30 de diciembre)
--
-- 3. Descuento: 15% en cualquier producto
-- 4. Limitaciones:
--    - Máximo 1 uso por día
--    - Máximo 1 uso en el mes (solo puede usarlo durante su semana de cumpleaños)
--
-- 5. Para cambiar el porcentaje de descuento:
--    UPDATE "Beneficio" 
--    SET condiciones = jsonb_set(condiciones, '{porcentajeDescuento}', '20')
--    WHERE id = 'beneficio-cumpleanos';
--
-- 6. Para cambiar la ventana de días (ej: solo el día del cumpleaños):
--    UPDATE "Beneficio" 
--    SET condiciones = jsonb_set(
--      jsonb_set(condiciones, '{diasAntes}', '0'),
--      '{diasDespues}', '0'
--    )
--    WHERE id = 'beneficio-cumpleanos';
-- ============================================================================
-- FIN DEL SCRIPT
-- ============================================================================