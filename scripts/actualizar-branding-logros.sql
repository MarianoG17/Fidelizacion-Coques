-- Script para actualizar el branding de "Fidelización Zona" a "Coques Bakery" en los logros
-- Actualizar el logro "Primera Visita"
UPDATE "Logro"
SET "descripcion" = '¡Bienvenido a Coques Bakery! Hiciste tu primera visita.'
WHERE "tipo" = 'PRIMERA_VISITA' AND "nombre" = 'Primera Visita';
