-- Script para actualizar la cuenta de prueba con email y password
-- Ejecutar en la consola SQL de Neon (base de datos de producción)

-- Actualizar la cuenta de Juan Pérez (teléfono +5491112345678)
-- Agregar email: juan.perez@test.com
-- Agregar password: test123 (hasheado con bcrypt)

UPDATE "Cliente"
SET 
  email = 'juan.perez@test.com',
  password = '$2b$10$rQZ4jxH6Q7Y9J5X8vW3.5uNvL6kxZ.aQ3pQhC5xB9bM6hW7xY8zAa'
WHERE phone = '+5491112345678';

-- Verificar que se actualizó correctamente
SELECT id, nombre, email, phone, estado 
FROM "Cliente" 
WHERE phone = '+5491112345678';

-- NOTA: 
-- Email: juan.perez@test.com
-- Password: test123
-- 
-- Después de ejecutar este script, podrás hacer login con:
-- - Email: juan.perez@test.com
-- - Password: test123
