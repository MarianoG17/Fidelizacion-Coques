-- Script para configurar descuentos de tortas por nivel
-- Ejecutar después de aplicar la migración 20260220_add_descuento_tortas
-- Configurar descuentos según la especificación:
-- Bronce: 5%
-- Plata: 10%
-- Oro: 15%
-- Platino: 20% (si existe)
UPDATE "Nivel"
SET "descuentoPedidosTortas" = 5
WHERE "nombre" = 'Bronce';
UPDATE "Nivel"
SET "descuentoPedidosTortas" = 10
WHERE "nombre" = 'Plata';
UPDATE "Nivel"
SET "descuentoPedidosTortas" = 15
WHERE "nombre" = 'Oro';
UPDATE "Nivel"
SET "descuentoPedidosTortas" = 20
WHERE "nombre" = 'Platino';
-- Verificar cambios
SELECT "nombre",
    "orden",
    "descuentoPedidosTortas",
    "criterios"
FROM "Nivel"
ORDER BY "orden";