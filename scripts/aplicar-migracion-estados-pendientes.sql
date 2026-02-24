-- Aplicar migración: EstadoAutoPendiente
-- Ejecutar con: psql $DATABASE_URL -f scripts/aplicar-migracion-estados-pendientes.sql
\ echo '🔧 Aplicando migración: EstadoAutoPendiente...' \ echo '' -- Verificar si la tabla ya existe
DO $$ BEGIN IF EXISTS (
    SELECT
    FROM information_schema.tables
    WHERE table_schema = 'public'
        AND table_name = 'EstadoAutoPendiente'
) THEN RAISE NOTICE '⚠️  La tabla EstadoAutoPendiente ya existe. Saltando creación.';
ELSE -- Crear tabla EstadoAutoPendiente
CREATE TABLE "EstadoAutoPendiente" (
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
CREATE INDEX "EstadoAutoPendiente_phone_idx" ON "EstadoAutoPendiente"("phone");
CREATE INDEX "EstadoAutoPendiente_procesado_idx" ON "EstadoAutoPendiente"("procesado");
CREATE INDEX "EstadoAutoPendiente_phone_procesado_idx" ON "EstadoAutoPendiente"("phone", "procesado");
CREATE INDEX "EstadoAutoPendiente_createdAt_idx" ON "EstadoAutoPendiente"("createdAt");
RAISE NOTICE '✅ Tabla EstadoAutoPendiente creada exitosamente';
END IF;
END $$;
\ echo '' \ echo '✅ Migración completada' \ echo '' \ echo '📊 Verificando tabla...' \ d "EstadoAutoPendiente" \ echo '' \ echo '📈 Estadísticas actuales:'
SELECT COUNT(*) as total,
    COUNT(*) FILTER (
        WHERE procesado = false
    ) as pendientes,
    COUNT(*) FILTER (
        WHERE procesado = true
    ) as procesados
FROM "EstadoAutoPendiente";