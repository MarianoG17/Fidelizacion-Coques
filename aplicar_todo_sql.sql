-- ========================================
-- SQL COMPLETO PARA APLICAR EN VERCEL
-- Aplica TODO de una vez: Passkeys + EstadoAutoEnum
-- ========================================
-- PARTE 1: CREAR TABLA PASSKEY
-- ========================================
CREATE TABLE IF NOT EXISTS "Passkey" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clienteId" TEXT NOT NULL,
    "credentialId" TEXT NOT NULL UNIQUE,
    "publicKey" TEXT NOT NULL,
    "counter" BIGINT NOT NULL DEFAULT 0,
    "transports" TEXT [] DEFAULT ARRAY []::TEXT [],
    "dispositivoNombre" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3),
    CONSTRAINT "Passkey_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "Passkey_clienteId_idx" ON "Passkey"("clienteId");
CREATE INDEX IF NOT EXISTS "Passkey_credentialId_idx" ON "Passkey"("credentialId");
-- PARTE 2: ARREGLAR ESTADO AUTO ENUM
-- ========================================
-- Normalizar valores no estándar
UPDATE "EstadoAutoPendiente"
SET estado = 'EN_PROCESO'
WHERE estado NOT IN ('EN_PROCESO', 'LISTO', 'ENTREGADO');
-- Crear el tipo ENUM si no existe
DO $$ BEGIN CREATE TYPE "EstadoAutoEnum" AS ENUM ('EN_PROCESO', 'LISTO', 'ENTREGADO');
EXCEPTION
WHEN duplicate_object THEN null;
END $$;
-- Cambiar la columna de TEXT a ENUM
ALTER TABLE "EstadoAutoPendiente"
ALTER COLUMN "estado" TYPE "EstadoAutoEnum" USING ("estado"::text::"EstadoAutoEnum");
-- VERIFICACIÓN FINAL
-- ========================================
-- Verificar que Passkey se creó
SELECT COUNT(*) as passkeys_count
FROM "Passkey";
-- Verificar que EstadoAutoEnum funciona
SELECT estado,
    COUNT(*)
FROM "EstadoAutoPendiente"
GROUP BY estado;
-- ========================================
-- ✅ TODO LISTO
-- ========================================