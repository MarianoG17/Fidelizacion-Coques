-- Ver la red completa de referidos: quién refirió a quién
-- Muestra el referidor, el referido y la fecha de registro
SELECT referidor.nombre as referidor_nombre,
    referidor.phone as referidor_phone,
    referidor."referidosActivados" as total_referidos,
    '→' as flecha,
    referido.nombre as referido_nombre,
    referido.phone as referido_phone,
    referido."createdAt" as fecha_registro
FROM "Cliente" referido
    LEFT JOIN "Cliente" referidor ON referido."referidoPorId" = referidor.id
WHERE referido."referidoPorId" IS NOT NULL
    AND referido.estado = 'ACTIVO'
ORDER BY referidor.nombre,
    referido."createdAt";
-- Resumen por referidor
SELECT c.nombre as referidor,
    c.phone,
    c."referidosActivados" as cantidad_referidos,
    COUNT(r.id) as referidos_verificados
FROM "Cliente" c
    LEFT JOIN "Cliente" r ON r."referidoPorId" = c.id
    AND r.estado = 'ACTIVO'
WHERE c."referidosActivados" > 0
GROUP BY c.id,
    c.nombre,
    c.phone,
    c."referidosActivados"
ORDER BY c."referidosActivados" DESC;