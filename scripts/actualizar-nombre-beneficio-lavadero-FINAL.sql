-- ============================================
-- Script: Actualizar nombre del beneficio del lavadero
-- ============================================
-- Propósito: Hacer más claro que el beneficio solo aplica cuando el auto está en lavadero
-- Fecha: 28 de Febrero 2026
-- Uso: Ejecutar en Neon SQL Editor
-- ============================================
-- ✅ ACTUALIZACIÓN (20% OFF al final del texto)
UPDATE "Beneficio"
SET nombre = '🚗 Cafetería mientras esperás tu auto — 20% OFF'
WHERE id = 'beneficio-20porciento-lavadero';
-- ============================================
-- VERIFICACIÓN: Ver el cambio aplicado
-- ============================================
SELECT id,
    nombre,
    "descripcionCaja",
    "requiereEstadoExterno",
    "estadoExternoTrigger"
FROM "Beneficio"
WHERE id = 'beneficio-20porciento-lavadero';
-- ============================================
-- RESULTADO ESPERADO EN LA APP:
-- ============================================
-- En /logros (vista de niveles):
-- ✓ 🚗 Cafetería mientras esperás tu auto — 20% OFF
-- En /pass (cuando está disponible):
-- 🚗 Cafetería mientras esperás tu auto — 20% OFF
-- Descuento del 20% mientras esperás tu auto
-- ============================================
-- IMPACTO DEL CAMBIO:
-- ============================================
/*
 ✅ Páginas afectadas:
 - /logros - Lista de beneficios por nivel
 - /pass - Beneficios disponibles cuando tiene auto en lavadero
 - Panel staff (/local) - Al escanear el QR del cliente
 
 ✅ Lo que NO cambia:
 - La lógica del beneficio (sigue siendo condicional)
 - Los triggers de activación (EN_PROCESO, LISTO)
 - La descripción que ve el staff en el scanner
 - Las reglas de negocio (20%, máx 1 por día, etc.)
 
 ✅ Mejora en UX:
 - Emoji 🚗 hace visual la referencia al lavadero
 - "Mientras esperás tu auto" deja claro que es temporal
 - "20% OFF" al final da énfasis al beneficio
 - Elimina toda confusión sobre cuándo aplica
 */
-- ============================================
-- ROLLBACK (si necesitás volver al nombre anterior):
-- ============================================
/*
 UPDATE "Beneficio"
 SET nombre = '20% descuento — Auto en lavadero'
 WHERE id = 'beneficio-20porciento-lavadero';
 */