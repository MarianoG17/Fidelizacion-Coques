-- ============================================
-- Script: Actualizar nombre del beneficio del lavadero para mayor claridad
-- ============================================
-- Propósito: Hacer más claro que el beneficio solo aplica cuando el auto está en lavadero
-- Fecha: 28 de Febrero 2026
-- ============================================
-- 📝 PROBLEMA ACTUAL:
-- En /logros se muestra: "20% descuento — Auto en lavadero"
-- El usuario puede pensar que es un beneficio siempre disponible
-- NO queda claro que es condicional (solo al lavar el auto)
-- ✅ SOLUCIÓN: Hacer el nombre más descriptivo
-- ============================================
-- OPCIÓN 1: Nombre corto y claro (RECOMENDADO)
-- ============================================
UPDATE "Beneficio"
SET nombre = '20% OFF cafetería al lavar tu auto'
WHERE id = 'beneficio-20porciento-lavadero';
-- ============================================
-- OPCIÓN 2: Nombre más explicativo
-- ============================================
/*
 UPDATE "Beneficio"
 SET nombre = '20% OFF cafetería (cortesía DeltaWash)'
 WHERE id = 'beneficio-20porciento-lavadero';
 */
-- ============================================
-- OPCIÓN 3: Nombre con emoji y condición clara
-- ============================================
/*
 UPDATE "Beneficio"
 SET nombre = '🚗 20% OFF cafetería mientras esperás tu auto'
 WHERE id = 'beneficio-20porciento-lavadero';
 */
-- ============================================
-- VERIFICACIÓN: Ver el cambio
-- ============================================
SELECT id,
    nombre,
    "descripcionCaja",
    "requiereEstadoExterno",
    "estadoExternoTrigger"
FROM "Beneficio"
WHERE id = 'beneficio-20porciento-lavadero';
-- ============================================
-- RESULTADO ESPERADO EN /logros:
-- ============================================
-- ANTES:
-- ✓ 20% descuento — Auto en lavadero  ← confuso
-- DESPUÉS (Opción 1):
-- ✓ 20% OFF cafetería al lavar tu auto  ← claro y conciso
-- DESPUÉS (Opción 2):
-- ✓ 20% OFF cafetería (cortesía DeltaWash)  ← menciona sponsor
-- DESPUÉS (Opción 3):
-- ✓ 🚗 20% OFF cafetería mientras esperás tu auto  ← emoji + contexto
-- ============================================
-- NOTAS:
-- ============================================
/*
 1. Este cambio se refleja en:
 - /logros - Lista de beneficios por nivel
 - /pass - Beneficios disponibles del día
 - Panel staff - Al escanear el QR
 
 2. El cambio NO afecta:
 - La lógica del beneficio (sigue siendo condicional)
 - Los triggers de activación (EN_PROCESO, LISTO)
 - La descripción que ve el staff
 
 3. Si el nuevo nombre es muy largo para la UI:
 - Se puede acortar más: "20% OFF al lavar auto"
 - O usar emoji: "🚗 20% OFF cafetería"
 
 4. La "descripcionCaja" es lo que ve el STAFF al escanear
 - No es necesario cambiarla
 - Puede mantenerse como: "DESCUENTO 20% LAVADERO"
 */