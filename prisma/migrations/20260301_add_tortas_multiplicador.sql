-- Agregar PEDIDO_TORTA al enum TipoEvento
ALTER TYPE "TipoEvento" ADD VALUE IF NOT EXISTS 'PEDIDO_TORTA';

-- Agregar campo tortasMultiplicador a ConfiguracionApp
ALTER TABLE "ConfiguracionApp" ADD COLUMN IF NOT EXISTS "tortasMultiplicador" INTEGER NOT NULL DEFAULT 3;

-- Verificar que se aplicó correctamente
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_type t
        JOIN pg_enum e ON t.oid = e.enumtypid
        WHERE t.typname = 'TipoEvento' AND e.enumlabel = 'PEDIDO_TORTA'
    ) THEN
        RAISE NOTICE '✅ PEDIDO_TORTA agregado al enum TipoEvento';
    ELSE
        RAISE EXCEPTION '❌ Error: PEDIDO_TORTA no se agregó correctamente';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'ConfiguracionApp' AND column_name = 'tortasMultiplicador'
    ) THEN
        RAISE NOTICE '✅ Campo tortasMultiplicador agregado a ConfiguracionApp';
    ELSE
        RAISE EXCEPTION '❌ Error: tortasMultiplicador no se agregó correctamente';
    END IF;
END $$;
