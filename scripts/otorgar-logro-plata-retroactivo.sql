-- Script para otorgar retroactivamente el logro de "Alcanzar nivel Plata"
-- a clientes que ya están en nivel Plata pero no tienen el logro
-- 1. Buscar el ID del logro de nivel Plata
WITH logro_plata AS (
  SELECT id
  FROM "Logro"
  WHERE tipo = 'NIVEL_ALCANZADO'
    AND "nivelId" IN (
      SELECT id
      FROM "Nivel"
      WHERE nombre = 'Plata'
    )
  LIMIT 1
), -- 2. Buscar el ID del nivel Plata
nivel_plata AS (
  SELECT id
  FROM "Nivel"
  WHERE nombre = 'Plata'
  LIMIT 1
), -- 3. Clientes que están en nivel Plata pero NO tienen el logro
clientes_sin_logro AS (
  SELECT c.id as "clienteId"
  FROM "Cliente" c
    CROSS JOIN logro_plata lp
  WHERE c."nivelId" = (
      SELECT id
      FROM nivel_plata
    )
    AND NOT EXISTS (
      SELECT 1
      FROM "LogroCliente" lc
      WHERE lc."clienteId" = c.id
        AND lc."logroId" = lp.id
    )
) -- 4. Insertar el logro para esos clientes
INSERT INTO "LogroCliente" ("clienteId", "logroId", visto, "obtenidoEn")
SELECT csl."clienteId",
  (
    SELECT id
    FROM logro_plata
  ),
  false,
  NOW()
FROM clientes_sin_logro csl;
-- Mostrar cuántos logros se otorgaron
SELECT COUNT(*) as "logros_otorgados"
FROM "Cliente" c
  CROSS JOIN (
    SELECT id
    FROM "Logro"
    WHERE tipo = 'NIVEL_ALCANZADO'
      AND "nivelId" IN (
        SELECT id
        FROM "Nivel"
        WHERE nombre = 'Plata'
      )
    LIMIT 1
  ) lp
WHERE c."nivelId" = (
    SELECT id
    FROM "Nivel"
    WHERE nombre = 'Plata'
    LIMIT 1
  )
  AND NOT EXISTS (
    SELECT 1
    FROM "LogroCliente" lc
    WHERE lc."clienteId" = c.id
      AND lc."logroId" = lp.id
  );