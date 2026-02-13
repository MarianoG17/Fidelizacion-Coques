-- ========================================
-- SCRIPT DE VERIFICACIÓN COMPLETA
-- Ejecutar en Neon SQL Editor
-- ========================================
-- ✅ PASO 1: Verificar nuevas columnas en Cliente
SELECT '1. COLUMNAS EN CLIENTE' as verificacion,
    CASE
        WHEN COUNT(*) = 6 THEN '✅ COMPLETO - Todas las columnas existen'
        ELSE '❌ FALTA - Solo ' || COUNT(*) || ' de 6 columnas encontradas'
    END as estado,
    STRING_AGG(column_name, ', ') as columnas_encontradas
FROM information_schema.columns
WHERE table_name = 'Cliente'
    AND column_name IN (
        'fechaCumpleanos',
        'codigoReferido',
        'referidoPorId',
        'referidosActivados',
        'resetPasswordToken',
        'resetPasswordExpires'
    );
-- ✅ PASO 2: Verificar nueva columna en Nivel
SELECT '2. COLUMNA EN NIVEL' as verificacion,
    CASE
        WHEN COUNT(*) = 1 THEN '✅ COMPLETO - descripcionBeneficios existe'
        ELSE '❌ FALTA - descripcionBeneficios no existe'
    END as estado
FROM information_schema.columns
WHERE table_name = 'Nivel'
    AND column_name = 'descripcionBeneficios';
-- ✅ PASO 3: Verificar nuevas tablas
SELECT '3. TABLAS NUEVAS' as verificacion,
    CASE
        WHEN COUNT(*) = 3 THEN '✅ COMPLETO - Feedback, Logro, LogroCliente creadas'
        WHEN COUNT(*) = 0 THEN '❌ FALTA - NO se crearon las tablas'
        ELSE '⚠️ PARCIAL - Solo ' || COUNT(*) || ' de 3 tablas creadas'
    END as estado,
    STRING_AGG(table_name, ', ') as tablas_encontradas
FROM information_schema.tables
WHERE table_schema = 'public'
    AND table_name IN ('Feedback', 'Logro', 'LogroCliente');
-- ✅ PASO 4: Verificar enum TipoLogro
SELECT '4. ENUM TIPOLOGRO' as verificacion,
    CASE
        WHEN COUNT(*) >= 10 THEN '✅ COMPLETO - Enum con ' || COUNT(*) || ' valores'
        WHEN COUNT(*) = 0 THEN '❌ FALTA - Enum no existe'
        ELSE '⚠️ PARCIAL - Solo ' || COUNT(*) || ' valores en enum'
    END as estado
FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
WHERE t.typname = 'TipoLogro';
-- ✅ PASO 5: Verificar cantidad de niveles (debe ser 3)
SELECT '5. CANTIDAD DE NIVELES' as verificacion,
    CASE
        WHEN COUNT(*) = 3 THEN '✅ COMPLETO - 3 niveles (Bronce, Plata, Oro)'
        WHEN COUNT(*) = 4 THEN '⚠️ ATENCIÓN - 4 niveles (falta eliminar Platino)'
        ELSE '❌ ERROR - ' || COUNT(*) || ' niveles encontrados'
    END as estado,
    STRING_AGG(
        nombre || ' (orden ' || orden || ')',
        ', '
        ORDER BY orden
    ) as niveles_actuales
FROM "Nivel";
-- ✅ PASO 6: Verificar descripciones de beneficios en niveles
SELECT '6. DESCRIPCIONES DE BENEFICIOS' as verificacion,
    CASE
        WHEN COUNT(*) = 3 THEN '✅ COMPLETO - Los 3 niveles tienen descripción'
        WHEN COUNT(*) = 0 THEN '❌ FALTA - Ningún nivel tiene descripción'
        ELSE '⚠️ PARCIAL - Solo ' || COUNT(*) || ' niveles con descripción'
    END as estado
FROM "Nivel"
WHERE "descripcionBeneficios" IS NOT NULL;
-- ✅ PASO 7: Ver detalles de niveles (para verificar orden y beneficios)
SELECT '7. DETALLE DE NIVELES' as verificacion,
    nombre,
    orden,
    LEFT("descripcionBeneficios", 50) as beneficios_preview
FROM "Nivel"
ORDER BY orden;
-- ✅ PASO 8: Verificar logros creados
SELECT '8. LOGROS CREADOS' as verificacion,
    CASE
        WHEN COUNT(*) >= 13 THEN '✅ COMPLETO - ' || COUNT(*) || ' logros creados'
        WHEN COUNT(*) = 0 THEN '❌ FALTA - No hay logros creados'
        ELSE '⚠️ PARCIAL - Solo ' || COUNT(*) || ' logros (se esperan 13+)'
    END as estado
FROM "Logro";
-- ✅ PASO 9: Ver lista de logros creados
SELECT '9. LISTA DE LOGROS' as verificacion,
    tipo,
    nombre,
    icono,
    "puntosXp"
FROM "Logro"
ORDER BY tipo,
    nombre;
-- ✅ PASO 10: Verificar códigos de referido generados
SELECT '10. CÓDIGOS DE REFERIDO' as verificacion,
    CASE
        WHEN COUNT(*) > 0 THEN '✅ COMPLETO - ' || COUNT(*) || ' clientes con código'
        ELSE '❌ FALTA - Ningún cliente tiene código de referido'
    END as estado,
    COUNT(*) as clientes_con_codigo
FROM "Cliente"
WHERE "codigoReferido" IS NOT NULL;
-- ✅ PASO 11: Verificar índices creados
SELECT '11. ÍNDICES NUEVOS' as verificacion,
    CASE
        WHEN COUNT(*) >= 8 THEN '✅ COMPLETO - ' || COUNT(*) || ' índices creados'
        WHEN COUNT(*) = 0 THEN '❌ FALTA - No hay índices nuevos'
        ELSE '⚠️ PARCIAL - Solo ' || COUNT(*) || ' índices'
    END as estado
FROM pg_indexes
WHERE tablename IN ('Cliente', 'Feedback', 'Logro', 'LogroCliente')
    AND indexname IN (
        'Cliente_codigoReferido_key',
        'Cliente_codigoReferido_idx',
        'Cliente_resetPasswordToken_key',
        'Cliente_resetPasswordToken_idx',
        'Feedback_clienteId_idx',
        'Feedback_localId_idx',
        'Feedback_calificacion_idx',
        'Feedback_createdAt_idx',
        'Logro_tipo_idx',
        'Logro_nivelId_idx',
        'LogroCliente_clienteId_logroId_key',
        'LogroCliente_clienteId_idx',
        'LogroCliente_logroId_idx',
        'LogroCliente_obtenidoEn_idx'
    );
-- ========================================
-- RESUMEN FINAL
-- ========================================
SELECT '📊 RESUMEN FINAL' as seccion,
    '---' as separador;
SELECT CASE
        WHEN (
            -- Verificar todas las condiciones críticas
            (
                SELECT COUNT(*)
                FROM information_schema.columns
                WHERE table_name = 'Cliente'
                    AND column_name IN (
                        'fechaCumpleanos',
                        'codigoReferido',
                        'referidoPorId',
                        'referidosActivados'
                    )
            ) = 4
            AND (
                SELECT COUNT(*)
                FROM information_schema.tables
                WHERE table_name IN ('Feedback', 'Logro', 'LogroCliente')
            ) = 3
            AND (
                SELECT COUNT(*)
                FROM "Nivel"
            ) = 3
            AND (
                SELECT COUNT(*)
                FROM "Nivel"
                WHERE "descripcionBeneficios" IS NOT NULL
            ) = 3
            AND (
                SELECT COUNT(*)
                FROM "Logro"
            ) >= 13
        ) THEN '✅✅✅ MIGRACIÓN COMPLETA - TODO CORRECTO ✅✅✅'
        ELSE '⚠️⚠️⚠️ MIGRACIÓN INCOMPLETA - VER DETALLES ARRIBA ⚠️⚠️⚠️'
    END as resultado_final;
-- ========================================
-- ACCIONES SUGERIDAS SI HAY PROBLEMAS
-- ========================================
SELECT '🔧 PRÓXIMOS PASOS' as seccion,
    '---' as separador;
-- Si falta crear tablas
SELECT 'ACCIÓN 1: Crear tablas' as accion,
    CASE
        WHEN (
            SELECT COUNT(*)
            FROM information_schema.tables
            WHERE table_name IN ('Feedback', 'Logro', 'LogroCliente')
        ) < 3 THEN '❌ EJECUTAR: prisma/migrations/20260213_add_nuevas_funcionalidades/migration.sql'
        ELSE '✅ Ya ejecutado'
    END as estado;
-- Si falta seed de niveles
SELECT 'ACCIÓN 2: Configurar 3 niveles' as accion,
    CASE
        WHEN (
            SELECT COUNT(*)
            FROM "Nivel"
        ) != 3
        OR (
            SELECT COUNT(*)
            FROM "Nivel"
            WHERE "descripcionBeneficios" IS NOT NULL
        ) < 3 THEN '❌ EJECUTAR: scripts/seed-3-niveles.sql (versión corregida)'
        ELSE '✅ Ya ejecutado'
    END as estado;
-- Si falta seed de logros
SELECT 'ACCIÓN 3: Crear logros' as accion,
    CASE
        WHEN (
            SELECT COUNT(*)
            FROM "Logro"
        ) < 13 THEN '❌ EJECUTAR: scripts/seed-beneficios-logros.sql'
        ELSE '✅ Ya ejecutado'
    END as estado;
-- Si faltan códigos de referido
SELECT 'ACCIÓN 4: Generar códigos de referido' as accion,
    CASE
        WHEN (
            SELECT COUNT(*)
            FROM "Cliente"
            WHERE "codigoReferido" IS NOT NULL
                AND estado = 'ACTIVO'
        ) = 0 THEN '❌ EJECUTAR: UPDATE de códigos (ver migration.sql línea final)'
        ELSE '✅ Ya ejecutado'
    END as estado;