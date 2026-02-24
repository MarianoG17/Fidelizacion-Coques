-- Migración: EstadoAutoPendiente
-- Para ejecutar en Neon Console o cualquier cliente SQL
-- Crear tabla EstadoAutoPendiente
CREATE TABLE IF NOT EXISTS "EstadoAutoPendiente" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "patente" TEXT NOT NULL,
    "estado" TEXT NOT NULL,
    "marca" TEXT,
    "modelo" TEXT,
    "notas" TEXT,
    "localOrigenId" TEXT,
    "procesado" BOOLEAN NOT NULL DEFAULT false,
    "procesadoEn" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "EstadoAutoPendiente_pkey" PRIMARY KEY ("id")
);
-- Crear índices
CREATE INDEX IF NOT EXISTS "EstadoAutoPendiente_phone_idx" ON "EstadoAutoPendiente"("phone");
CREATE INDEX IF NOT EXISTS "EstadoAutoPendiente_procesado_idx" ON "EstadoAutoPendiente"("procesado");
CREATE INDEX IF NOT EXISTS "EstadoAutoPendiente_phone_procesado_idx" ON "EstadoAutoPendiente"("phone", "procesado");
CREATE INDEX IF NOT EXISTS "EstadoAutoPendiente_createdAt_idx" ON "EstadoAutoPendiente"("createdAt");
-- Verificar que se creó
SELECT 'Tabla creada exitosamente' as resultado;