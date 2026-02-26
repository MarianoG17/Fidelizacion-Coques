-- Migration: Add OAuth fields to Cliente table
-- Date: 2026-02-26
-- Purpose: Support Google OAuth authentication
-- Add OAuth fields to Cliente table
ALTER TABLE "Cliente"
ADD COLUMN IF NOT EXISTS "googleId" TEXT,
    ADD COLUMN IF NOT EXISTS "authProvider" TEXT DEFAULT 'email',
    ADD COLUMN IF NOT EXISTS "profileImage" TEXT;
-- Create unique index on googleId
CREATE UNIQUE INDEX IF NOT EXISTS "Cliente_googleId_key" ON "Cliente"("googleId");
-- Update existing clients to have authProvider = 'email'
UPDATE "Cliente"
SET "authProvider" = 'email'
WHERE "authProvider" IS NULL;