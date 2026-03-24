-- Migration: Add staffRegistro field to Cliente
-- This separates staff tracking from user-reported fuenteConocimiento

ALTER TABLE "Cliente" ADD COLUMN IF NOT EXISTS "staffRegistro" TEXT;
