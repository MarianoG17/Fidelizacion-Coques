-- Script para verificar los beneficios configurados por nivel
-- 1. Ver todos los niveles con su descripción de beneficios
SELECT id,
    nombre,
    orden,
    "descripcionBeneficios"
FROM "Nivel"
ORDER BY orden;
-- 2. Ver todos los beneficios del sistema
SELECT id,
    nombre,
    descripcion,
    tipo,
    descuento,
    "esAcumulable",
    "requiereValidacion",
    activo
FROM "Beneficio"
WHERE activo = true
ORDER BY nombre;
-- 3. Ver la relación entre niveles y beneficios
SELECT n.nombre as nivel,
    b.nombre as beneficio,
    b.descripcion,
    b.tipo,
    b.descuento,
    nb."usosPorDia",
    nb."usosPorSemana",
    nb."usosPorMes"
FROM "NivelBeneficio" nb
    INNER JOIN "Nivel" n ON nb."nivelId" = n.id
    INNER JOIN "Beneficio" b ON nb."beneficioId" = b.id
WHERE b.activo = true
ORDER BY n.orden,
    b.nombre;