-- Script para limpiar cuentas de prueba antes de volver a registrarse
-- Ejecutar en Neon SQL Editor
-- Borrar eventos asociados
DELETE FROM "EventoScan"
WHERE "clienteId" IN (
        SELECT id
        FROM "Cliente"
        WHERE email = 'mariano17bsas@gmail.com'
    );
-- Borrar autos asociados
DELETE FROM "Auto"
WHERE "clienteId" IN (
        SELECT id
        FROM "Cliente"
        WHERE email = 'mariano17bsas@gmail.com'
    );
-- Borrar inscripciones asociadas
DELETE FROM "Inscripcion"
WHERE "clienteId" IN (
        SELECT id
        FROM "Cliente"
        WHERE email = 'mariano17bsas@gmail.com'
    );
-- Borrar noticias asociadas
DELETE FROM "Noticia"
WHERE "clienteId" IN (
        SELECT id
        FROM "Cliente"
        WHERE email = 'mariano17bsas@gmail.com'
    );
-- Finalmente borrar el cliente
DELETE FROM "Cliente"
WHERE email = 'mariano17bsas@gmail.com';
-- Verificar que se borró
SELECT *
FROM "Cliente"
WHERE email = 'mariano17bsas@gmail.com';