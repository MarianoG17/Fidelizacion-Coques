-- Solo crear tabla Passkey sin afectar otras tablas
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