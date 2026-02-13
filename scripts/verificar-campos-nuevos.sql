-- Script para verificar que todos los campos nuevos existen en la base de datos

-- 1. Verificar campos nuevos en tabla Cliente
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'Cliente'
AND column_name IN ('fechaCumpleanos', 'codigoReferido', 'referidosActivados', 'referidoPorId', 'resetPasswordToken', 'resetPasswordExpires')
ORDER BY column_name;

-- 2. Verificar campo descripcionBeneficios en tabla Nivel
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'Nivel'
AND column_name = 'descripcionBeneficios';

-- 3. Verificar que existen las nuevas tablas
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('Feedback', 'Logro', 'LogroCliente')
ORDER BY table_name;

-- 4. Verificar cantidad de registros en cada tabla nueva
SELECT 'Feedback' as tabla, COUNT(*) as cantidad FROM "Feedback"
UNION ALL
SELECT 'Logro' as tabla, COUNT(*) as cantidad FROM "Logro"
UNION ALL
SELECT 'LogroCliente' as tabla, COUNT(*) as cantidad FROM "LogroCliente";

-- 5. Verificar que los clientes tienen códigos de referido
SELECT 
    COUNT(*) as total_clientes,
    COUNT(CASE WHEN "codigoReferido" IS NOT NULL THEN 1 END) as con_codigo,
    COUNT(CASE WHEN "codigoReferido" IS NULL THEN 1 END) as sin_codigo
FROM "Cliente"
WHERE estado = 'ACTIVO';
