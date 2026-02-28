-- Migration: Add Notificacion table for push notification history
-- Date: 2026-02-28
-- Create Notificacion table
CREATE TABLE "Notificacion" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "cuerpo" TEXT NOT NULL,
    "url" TEXT,
    "icono" TEXT,
    "leida" BOOLEAN NOT NULL DEFAULT false,
    "enviada" BOOLEAN NOT NULL DEFAULT false,
    "tipo" TEXT,
    "metadata" JSONB,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leidaEn" TIMESTAMP(3),
    CONSTRAINT "Notificacion_pkey" PRIMARY KEY ("id")
);
-- Create indexes
CREATE INDEX "Notificacion_clienteId_idx" ON "Notificacion"("clienteId");
CREATE INDEX "Notificacion_clienteId_leida_idx" ON "Notificacion"("clienteId", "leida");
CREATE INDEX "Notificacion_creadoEn_idx" ON "Notificacion"("creadoEn");
-- Add foreign key constraint
ALTER TABLE "Notificacion"
ADD CONSTRAINT "Notificacion_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;