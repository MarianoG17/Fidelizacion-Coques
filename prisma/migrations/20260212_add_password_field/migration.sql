-- AlterTable: Add password field to Cliente
-- Migration: add_password_field
-- Date: 2026-02-12
ALTER TABLE "Cliente"
ADD COLUMN "password" TEXT;