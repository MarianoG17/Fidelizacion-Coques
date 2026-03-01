-- Verificar si el flag soloApp está correctamente aplicado
-- Ver beneficios de tortas con el flag soloApp
SELECT nombre,
    activo,
    condiciones->'soloApp' as solo_app_flag,
    condiciones->'descuento' as descuento,
    condiciones
FROM "Beneficio"
WHERE nombre ILIKE '%tortas%'
    OR nombre ILIKE '%descuento%tortas%'
    OR nombre ILIKE 'bonificacion tortas%'
ORDER BY nombre;
-- Contar beneficios con y sin el flag
SELECT CASE
        WHEN condiciones->>'soloApp' = 'true' THEN 'Con soloApp'
        ELSE 'Sin soloApp'
    END as estado,
    COUNT(*) as cantidad
FROM "Beneficio"
WHERE nombre ILIKE '%tortas%'
GROUP BY CASE
        WHEN condiciones->>'soloApp' = 'true' THEN 'Con soloApp'
        ELSE 'Sin soloApp'
    END;