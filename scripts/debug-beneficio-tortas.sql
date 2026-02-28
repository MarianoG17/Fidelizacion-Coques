-- Debug: Beneficio "bonificacion tortas 15% off"
-- 1. Ver el beneficio
SELECT id,
    nombre,
    activo,
    "requiereEstadoExterno",
    "estadoExternoTrigger",
    condiciones
FROM "Beneficio"
WHERE nombre ILIKE '%tortas%'
    OR nombre ILIKE '%15%';
-- 2. Ver si tiene usos registrados
SELECT e.id,
    e."clienteId",
    e."beneficioId",
    e."tipoEvento",
    e.timestamp,
    e.contabilizada,
    c.nombre as cliente_nombre
FROM "EventoScan" e
    LEFT JOIN "Cliente" c ON c.id = e."clienteId"
WHERE e."beneficioId" IN (
        SELECT id
        FROM "Beneficio"
        WHERE nombre ILIKE '%tortas%'
            OR nombre ILIKE '%15%'
    )
ORDER BY e.timestamp DESC
LIMIT 20;
-- 3. Ver la configuración completa del beneficio
SELECT b.id,
    b.nombre,
    b.descripcion,
    b."descripcionCaja",
    b.activo,
    b."requiereEstadoExterno",
    b."estadoExternoTrigger",
    b.condiciones,
    b."createdAt",
    nb."nivelId",
    n.nombre as nivel_nombre
FROM "Beneficio" b
    LEFT JOIN "NivelBeneficio" nb ON nb."beneficioId" = b.id
    LEFT JOIN "Nivel" n ON n.id = nb."nivelId"
WHERE b.nombre ILIKE '%tortas%'
    OR b.nombre ILIKE '%15%';