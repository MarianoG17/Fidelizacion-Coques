-- Migration: Nuevas funcionalidades (Referidos, Feedback, Gamificación, Cumpleaños)
-- Agregar nuevos campos a Cliente
ALTER TABLE "Cliente"
ADD COLUMN IF NOT EXISTS "fechaCumpleanos" TIMESTAMP(3);
ALTER TABLE "Cliente"
ADD COLUMN IF NOT EXISTS "codigoReferido" TEXT;
ALTER TABLE "Cliente"
ADD COLUMN IF NOT EXISTS "referidoPorId" TEXT;
ALTER TABLE "Cliente"
ADD COLUMN IF NOT EXISTS "referidosActivados" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Cliente"
ADD COLUMN IF NOT EXISTS "resetPasswordToken" TEXT;
ALTER TABLE "Cliente"
ADD COLUMN IF NOT EXISTS "resetPasswordExpires" TIMESTAMP(3);
-- Agregar índices únicos
CREATE UNIQUE INDEX IF NOT EXISTS "Cliente_codigoReferido_key" ON "Cliente"("codigoReferido");
CREATE UNIQUE INDEX IF NOT EXISTS "Cliente_resetPasswordToken_key" ON "Cliente"("resetPasswordToken");
-- Agregar índices de búsqueda
CREATE INDEX IF NOT EXISTS "Cliente_codigoReferido_idx" ON "Cliente"("codigoReferido");
CREATE INDEX IF NOT EXISTS "Cliente_resetPasswordToken_idx" ON "Cliente"("resetPasswordToken");
-- Agregar relación de auto-referencia para referidos
ALTER TABLE "Cliente"
ADD CONSTRAINT "Cliente_referidoPorId_fkey" FOREIGN KEY ("referidoPorId") REFERENCES "Cliente"("id") ON DELETE
SET NULL ON UPDATE CASCADE;
-- Agregar campo de descripción de beneficios a Nivel
ALTER TABLE "Nivel"
ADD COLUMN IF NOT EXISTS "descripcionBeneficios" TEXT;
-- Crear enum TipoLogro
DO $$ BEGIN CREATE TYPE "TipoLogro" AS ENUM (
    'PRIMERA_VISITA',
    'VISITAS_CONSECUTIVAS',
    'NIVEL_ALCANZADO',
    'REFERIDOS',
    'FEEDBACK_POSITIVO',
    'CUMPLEANOS',
    'ANIVERSARIO',
    'USO_CRUZADO',
    'MADRUGADOR',
    'CLIENTE_VIP'
);
EXCEPTION
WHEN duplicate_object THEN null;
END $$;
-- Crear tabla Feedback
CREATE TABLE IF NOT EXISTS "Feedback" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "localId" TEXT NOT NULL,
    "eventoScanId" TEXT,
    "calificacion" INTEGER NOT NULL,
    "comentario" TEXT,
    "enviadoGoogleMaps" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);
-- Crear índices para Feedback
CREATE INDEX IF NOT EXISTS "Feedback_clienteId_idx" ON "Feedback"("clienteId");
CREATE INDEX IF NOT EXISTS "Feedback_localId_idx" ON "Feedback"("localId");
CREATE INDEX IF NOT EXISTS "Feedback_calificacion_idx" ON "Feedback"("calificacion");
CREATE INDEX IF NOT EXISTS "Feedback_createdAt_idx" ON "Feedback"("createdAt");
-- Agregar foreign keys a Feedback
ALTER TABLE "Feedback"
ADD CONSTRAINT "Feedback_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- Crear tabla Logro
CREATE TABLE IF NOT EXISTS "Logro" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "tipo" "TipoLogro" NOT NULL,
    "icono" TEXT,
    "nivelId" TEXT,
    "criterios" JSONB NOT NULL,
    "puntosXp" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Logro_pkey" PRIMARY KEY ("id")
);
-- Crear índices para Logro
CREATE INDEX IF NOT EXISTS "Logro_tipo_idx" ON "Logro"("tipo");
CREATE INDEX IF NOT EXISTS "Logro_nivelId_idx" ON "Logro"("nivelId");
-- Agregar foreign key a Logro
ALTER TABLE "Logro"
ADD CONSTRAINT "Logro_nivelId_fkey" FOREIGN KEY ("nivelId") REFERENCES "Nivel"("id") ON DELETE
SET NULL ON UPDATE CASCADE;
-- Crear tabla LogroCliente
CREATE TABLE IF NOT EXISTS "LogroCliente" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "logroId" TEXT NOT NULL,
    "obtenidoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "visto" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "LogroCliente_pkey" PRIMARY KEY ("id")
);
-- Crear índices para LogroCliente
CREATE UNIQUE INDEX IF NOT EXISTS "LogroCliente_clienteId_logroId_key" ON "LogroCliente"("clienteId", "logroId");
CREATE INDEX IF NOT EXISTS "LogroCliente_clienteId_idx" ON "LogroCliente"("clienteId");
CREATE INDEX IF NOT EXISTS "LogroCliente_logroId_idx" ON "LogroCliente"("logroId");
CREATE INDEX IF NOT EXISTS "LogroCliente_obtenidoEn_idx" ON "LogroCliente"("obtenidoEn");
-- Agregar foreign keys a LogroCliente
ALTER TABLE "LogroCliente"
ADD CONSTRAINT "LogroCliente_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LogroCliente"
ADD CONSTRAINT "LogroCliente_logroId_fkey" FOREIGN KEY ("logroId") REFERENCES "Logro"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- Generar códigos de referido para clientes existentes
UPDATE "Cliente"
SET "codigoReferido" = UPPER(
        SUBSTRING(
            MD5(RANDOM()::text || id)
            FROM 1 FOR 8
        )
    )
WHERE "codigoReferido" IS NULL
    AND "estado" = 'ACTIVO';