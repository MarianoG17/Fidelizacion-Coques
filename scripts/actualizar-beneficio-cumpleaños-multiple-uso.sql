-- Script: Actualizar beneficio de cumpleaños para permitir uso diario durante la semana
-- Descripción: Permite usar el beneficio todos los días durante la semana de cumpleaños
-- ============================================================================

UPDATE "Beneficio"
SET condiciones = jsonb_build_object(
    'porcentajeDescuento', 15,              -- 15% de descuento
    'maxPorDia', 1,                         -- Máximo 1 uso por día
    'duracionMinutos', NULL,                -- Sin duración, válido toda la semana
    'mensaje', '¡Feliz cumpleaños! Disfrutá tu descuento especial',
    'requiereFechaCumpleanos', true,        -- Requiere fecha de cumpleaños
    'diasAntes', 3,                         -- Activar 3 días antes
    'diasDespues', 3                        -- Hasta 3 días después
    -- NOTA: Se removieron 'maxPorAño', 'diasMinimosEntreUsos'
    -- Esto permite usar el beneficio todos los días durante la semana
),
"updatedAt" = NOW()
WHERE id = 'beneficio-cumpleanos';

-- Verificar la actualización
SELECT 
    id,
    nombre,
    "descripcionCaja",
    condiciones,
    activo
FROM "Beneficio"
WHERE id = 'beneficio-cumpleanos';

-- ============================================================================
-- EXPLICACIÓN DEL COMPORTAMIENTO:
-- ============================================================================
-- 
-- CON ESTA CONFIGURACIÓN:
-- - Durante los 7 días de su semana de cumpleaños (3 antes + día + 3 después)
-- - El cliente puede venir TODOS LOS DÍAS y usar el beneficio
-- - Máximo 1 uso por día (maxPorDia: 1)
-- - Después de esos 7 días, el beneficio se desactiva automáticamente
-- - El siguiente año, en su cumpleaños, el beneficio se reactiva automáticamente
--
-- PROTECCIÓN CONTRA ABUSO:
-- - El beneficio solo está activo durante la ventana del cumpleaños
-- - La lógica en getBeneficiosActivos() verifica la fecha actual vs cumpleaños
-- - Si alguien cambia su cumpleaños, técnicamente podría aprovechar otra ventana
-- - Pero es un caso de uso raro y difícil de prevenir sin bloquear el uso diario
--
-- DIFERENCIA CON CONFIGURACIÓN ANTERIOR:
-- - ANTES: diasMinimosEntreUsos: 365 bloqueaba TODOS los usos por 365 días
--          (solo podían usar el beneficio UNA VEZ durante la semana)
-- - AHORA: Sin diasMinimosEntreUsos, pueden usar el beneficio CADA DÍA
--          durante toda la semana de cumpleaños
--
-- ============================================================================
