-- Migración: Agregar tabla Passkey para autenticación biométrica (WebAuthn)
-- Fecha: 2026-03-09
-- Descripción: Permite a los usuarios usar huella digital o Face ID para login
-- Crear tabla passkeys
CREATE TABLE IF NOT EXISTS "Passkey" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
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
-- Crear índices para optimizar consultas
CREATE INDEX IF NOT EXISTS "Passkey_clienteId_idx" ON "Passkey"("clienteId");
CREATE INDEX IF NOT EXISTS "Passkey_credentialId_idx" ON "Passkey"("credentialId");
-- Comentarios
COMMENT ON TABLE "Passkey" IS 'Credenciales biométricas para autenticación sin contraseña (WebAuthn)';
COMMENT ON COLUMN "Passkey"."credentialId" IS 'ID único de la credencial generada por el dispositivo';
COMMENT ON COLUMN "Passkey"."publicKey" IS 'Clave pública en formato base64 para verificar firmas';
COMMENT ON COLUMN "Passkey"."counter" IS 'Contador de usos para prevenir replay attacks';
COMMENT ON COLUMN "Passkey"."transports" IS 'Métodos de transporte soportados: internal, usb, nfc, ble';