-- ============================================
-- Script: Corregir Visitas Bonus por Completar Cuestionario
-- ============================================
-- Problema: Las visitas bonus por completar cuestionario tienen metodoValidacion = "OTP_MANUAL"
-- lo que las hace indistinguibles de visitas reales en las estadísticas del admin.
--
-- Impacto: Confunde al ver la primera "visita" de un cliente que nunca vino al local.
-- 
-- Solución: Cambiar metodoValidacion a "BONUS_CUESTIONARIO" para poder filtrarlas.
-- ============================================
-- ============================================
-- 1. VER EL PROBLEMA (CONSULTA)
-- ============================================
-- Ver todas las visitas bonus por cuestionario actuales
SELECT c.nombre,
    c."createdAt" as fecha_registro,
    es."timestamp" as timestamp_visita,
    EXTRACT(
        EPOCH
        FROM (es."timestamp" - c."createdAt")
    ) / 60 as minutos_despues_registro,
    es."metodoValidacion",
    es."notas"
FROM "Cliente" c
    JOIN "EventoScan" es ON es."clienteId" = c.id
WHERE es."notas" = 'Visita bonus por completar cuestionario'
ORDER BY es."timestamp" DESC;
-- ============================================
-- 2. ACTUALIZAR EVENTOS EXISTENTES
-- ============================================
-- Cambiar metodoValidacion de todas las visitas bonus de cuestionario
UPDATE "EventoScan"
SET "metodoValidacion" = 'BONUS_CUESTIONARIO'
WHERE "notas" = 'Visita bonus por completar cuestionario'
    AND "metodoValidacion" = 'OTP_MANUAL';
-- ============================================
-- 3. VERIFICACIÓN
-- ============================================
-- Verificar el cambio
SELECT "metodoValidacion",
    COUNT(*) as cantidad
FROM "EventoScan"
WHERE "notas" = 'Visita bonus por completar cuestionario'
GROUP BY "metodoValidacion";
-- Debería mostrar:
-- metodoValidacion        | cantidad
-- ------------------------|----------
-- BONUS_CUESTIONARIO      | 12 (o el número total)
-- ============================================
-- 4. TAMBIÉN ACTUALIZAR OTRAS VISITAS BONUS
-- ============================================
-- Ver todos los tipos de visitas bonus
SELECT "notas",
    COUNT(*) as cantidad
FROM "EventoScan"
WHERE "notas" ILIKE '%bonus%'
GROUP BY "notas"
ORDER BY cantidad DESC;
-- Actualizar visitas bonus por referir
UPDATE "EventoScan"
SET "metodoValidacion" = 'BONUS_REFERIDO'
WHERE "notas" ILIKE 'Visita bonus por referir%'
    AND "metodoValidacion" = 'OTP_MANUAL';
-- ============================================
-- 5. VERIFICACIÓN FINAL
-- ============================================
-- Ver distribución de métodos de validación
SELECT "metodoValidacion",
    COUNT(*) as cantidad,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as porcentaje
FROM "EventoScan"
GROUP BY "metodoValidacion"
ORDER BY cantidad DESC;
-- Resultado esperado:
-- metodoValidacion        | cantidad | porcentaje
-- ------------------------|----------|------------
-- QR                      | XXX      | XX.XX
-- OTP_MANUAL              | XXX      | XX.XX  (solo visitas reales)
-- BONUS_CUESTIONARIO      | 12       | X.XX
-- BONUS_REFERIDO          | 6        | X.XX
-- ============================================
-- 6. CONSULTA MEJORADA PARA ESTADÍSTICAS
-- ============================================
-- Ahora las estadísticas pueden filtrar fácilmente:
-- A) Solo visitas REALES (sin bonus):
SELECT c.nombre,
    COUNT(es.id) as visitas_reales
FROM "Cliente" c
    LEFT JOIN "EventoScan" es ON es."clienteId" = c.id
    AND es."metodoValidacion" NOT IN ('BONUS_CUESTIONARIO', 'BONUS_REFERIDO')
GROUP BY c.id,
    c.nombre
ORDER BY visitas_reales DESC;
-- B) Visitas REALES + BONUS separadas:
SELECT c.nombre,
    COUNT(
        CASE
            WHEN es."metodoValidacion" IN ('QR', 'OTP_MANUAL') THEN 1
        END
    ) as visitas_reales,
    COUNT(
        CASE
            WHEN es."metodoValidacion" IN ('BONUS_CUESTIONARIO', 'BONUS_REFERIDO') THEN 1
        END
    ) as visitas_bonus,
    COUNT(es.id) as total
FROM "Cliente" c
    LEFT JOIN "EventoScan" es ON es."clienteId" = c.id
GROUP BY c.id,
    c.nombre
HAVING COUNT(es.id) > 0
ORDER BY visitas_reales DESC;
-- ============================================
-- 7. ROLLBACK (si es necesario)
-- ============================================
/*
 -- Revertir cambios (solo si algo salió mal):
 UPDATE "EventoScan"
 SET "metodoValidacion" = 'OTP_MANUAL'
 WHERE "metodoValidacion" IN ('BONUS_CUESTIONARIO', 'BONUS_REFERIDO');
 */
-- ============================================
-- NOTAS FINALES
-- ============================================
/*
 DESPUÉS DE EJECUTAR ESTE SCRIPT:
 
 1. Las visitas bonus ya NO aparecerán como visitas reales en estadísticas
 2. El admin puede ver claramente la primera visita REAL vs la bonus
 3. Los contadores de visitas para niveles siguen funcionando (cuenta TODAS)
 4. Si querés excluir bonus del conteo de niveles, modificar en el código
 
 CÓDIGO A ACTUALIZAR:
 - src/app/api/perfil/cuestionario/route.ts (o donde se crea la visita bonus)
 - Cambiar de 'OTP_MANUAL' a 'BONUS_CUESTIONARIO' al crear el evento
 */