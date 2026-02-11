-- Migration: Convertir EstadoAuto de relación 1:1 a sistema de múltiples autos por cliente
-- Fecha: 2026-02-11

-- Paso 1: Crear nueva tabla Auto
CREATE TABLE "Auto" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clienteId" TEXT NOT NULL,
    "patente" TEXT NOT NULL,
    "marca" TEXT,
    "modelo" TEXT,
    "alias" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    
    CONSTRAINT "Auto_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Paso 2: Crear índices para Auto
CREATE UNIQUE INDEX "Auto_clienteId_patente_key" ON "Auto"("clienteId", "patente");
CREATE INDEX "Auto_clienteId_idx" ON "Auto"("clienteId");
CREATE INDEX "Auto_patente_idx" ON "Auto"("patente");

-- Paso 3: Migrar datos existentes de EstadoAuto a Auto
-- Para cada EstadoAuto existente, crear un Auto con esa patente (si existe)
INSERT INTO "Auto" ("id", "clienteId", "patente", "createdAt", "updatedAt")
SELECT 
    gen_random_uuid(),
    "clienteId",
    COALESCE("patente", 'MIGRADO'),  -- Si no tiene patente, usar placeholder
    "createdAt",
    "updatedAt"
FROM "EstadoAuto"
WHERE "patente" IS NOT NULL AND "patente" != '';

-- Paso 4: Crear nueva tabla EstadoAuto con relación a Auto
CREATE TABLE "EstadoAuto_new" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "autoId" TEXT NOT NULL,
    "estado" "EstadoAutoEnum" NOT NULL,
    "localOrigenId" TEXT NOT NULL,
    "notas" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "EstadoAuto_new_autoId_fkey" FOREIGN KEY ("autoId") REFERENCES "Auto" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Paso 5: Crear índices para nueva EstadoAuto
CREATE UNIQUE INDEX "EstadoAuto_new_autoId_key" ON "EstadoAuto_new"("autoId");
CREATE INDEX "EstadoAuto_new_autoId_idx" ON "EstadoAuto_new"("autoId");
CREATE INDEX "EstadoAuto_new_estado_idx" ON "EstadoAuto_new"("estado");

-- Paso 6: Migrar estados existentes a la nueva tabla
INSERT INTO "EstadoAuto_new" ("id", "autoId", "estado", "localOrigenId", "notas", "createdAt", "updatedAt")
SELECT 
    ea."id",
    a."id" as "autoId",
    ea."estado",
    ea."localOrigenId",
    ea."notas",
    ea."createdAt",
    ea."updatedAt"
FROM "EstadoAuto" ea
JOIN "Auto" a ON a."clienteId" = ea."clienteId" AND a."patente" = COALESCE(ea."patente", 'MIGRADO');

-- Paso 7: Drop tabla vieja y renombrar
DROP TABLE "EstadoAuto";
ALTER TABLE "EstadoAuto_new" RENAME TO "EstadoAuto";

-- Paso 8: Limpiar autos con patente MIGRADO que no tienen estado
-- (estos son autos que se crearon pero no tenían patente en el sistema viejo)
DELETE FROM "Auto" WHERE "patente" = 'MIGRADO' AND "id" NOT IN (SELECT "autoId" FROM "EstadoAuto");
